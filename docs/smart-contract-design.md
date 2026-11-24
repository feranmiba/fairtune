# FairTune Royalty Agreement Smart Contract Design

## 1. Overview

The FairTune Royalty Agreement Smart Contract (`fairtune_royalty_agreement`) is written in Rust using Soroban SDK `v22.0.0` for the Stellar network. It provides a secure, decentralized, and transparent mechanism to enforce multi-party music royalty agreements, hold payment tokens in escrow, and distribute funds deterministically based on agreed splits.

- **Crate:** `contracts/royalty-agreement`
- **Target:** `wasm32-unknown-unknown`
- **Binary Size:** ~25 KB (optimized release)

---

## 2. Storage Layout & Data Structures

The contract uses Soroban's instance storage to store global counters and agreement state. Instance storage lives for the lifetime of the contract instance and is maintained via automatic or manual rent extension.

### 2.1 Storage Keys (`DataKey`)

```rust
#[contracttype]
pub enum DataKey {
    Agreement(u64),        // Agreement record by unique numeric ID
    AgreementCount,        // Counter for total created agreements
}
```

### 2.2 Core Types

#### `Participant`

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Participant {
    pub address: Address,      // Stellar account address (G...)
    pub basis_points: u32,     // Allocation in basis points (1 bp = 0.01%, 10,000 max)
}
```

#### `AgreementStatus`

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AgreementStatus {
    PendingApproval,  // Created, awaiting all collaborator approvals
    Active,           // Fully approved by all participants; ready for deposits
    Funded,           // Escrow holds funds awaiting distribution
    Completed,        // Terminal state or after final payout
    Cancelled,        // Voided before activation; zero funds processed
}
```

#### `RoyaltyAgreement`

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyAgreement {
    pub id: u64,                        // Unique monotonically increasing ID
    pub creator: Address,                // Agreement creator
    pub track_id: String,               // ISRC, IPFS hash, or track identifier
    pub metadata_hash: BytesN<32>,      // SHA-256 hash of legal contract text
    pub token: Address,                 // SAC token contract address
    pub participants: Vec<Participant>, // List of participants & allocations
    pub approvals: Vec<Address>,        // Addresses that have submitted approvals
    pub status: AgreementStatus,        // Current lifecycle state
    pub total_deposited: i128,          // Cumulative amount deposited in escrow
    pub total_distributed: i128,        // Cumulative amount paid out
    pub created_at: u64,                // Ledger timestamp at creation
}
```

---

## 3. Public Contract Interface

```rust
pub trait FairTuneRoyaltyTrait {
    fn create_agreement(
        env: Env,
        creator: Address,
        track_id: String,
        metadata_hash: BytesN<32>,
        token: Address,
        participants: Vec<Participant>,
    ) -> Result<u64, ContractError>;

    fn approve_agreement(
        env: Env,
        agreement_id: u64,
        participant: Address,
    ) -> Result<(), ContractError>;

    fn deposit_escrow(
        env: Env,
        agreement_id: u64,
        payer: Address,
        amount: i128,
    ) -> Result<(), ContractError>;

    fn distribute_royalties(
        env: Env,
        agreement_id: u64,
        caller: Address,
    ) -> Result<(), ContractError>;

    fn cancel_agreement(
        env: Env,
        agreement_id: u64,
        caller: Address,
    ) -> Result<(), ContractError>;

    fn get_agreement(env: Env, agreement_id: u64) -> Result<RoyaltyAgreement, ContractError>;
    fn get_agreement_status(env: Env, agreement_id: u64) -> Result<AgreementStatus, ContractError>;
    fn get_agreement_count(env: Env) -> u64;
    fn get_undistributed_balance(env: Env, agreement_id: u64) -> Result<i128, ContractError>;
}
```

---

## 4. Authorization & Security Matrix

Every state mutation enforces explicit Soroban cryptographic authorization (`require_auth()`):

| Function               | Authorized Signer | Constraints & Preconditions                                                                                  |
| :--------------------- | :---------------- | :----------------------------------------------------------------------------------------------------------- |
| `create_agreement`     | `creator`         | $\sum \text{basis\_points} == 10,000$; no duplicate participants; participants $> 0$.                        |
| `approve_agreement`    | `participant`     | Must be listed in `participants`; agreement status must be `PendingApproval`; cannot double-approve.         |
| `deposit_escrow`       | `payer`           | Agreement status must be `Active` or `Funded`; `amount > 0`; payer must have token balance & allowance/auth. |
| `distribute_royalties` | `caller`          | `caller` must be creator or participant; undistributed balance $> 0$.                                        |
| `cancel_agreement`     | `caller`          | `caller == creator`; status must be `PendingApproval`; `total_deposited == 0`.                               |

---

## 5. Mathematical Guarantees & Remainder Invariant

To guarantee absolute financial integrity without token trapping:

1. **Total Allocation Invariant:**
   $$\sum_{i=1}^{n} \text{basis\_points}_i = 10,000 \quad (100.00\%)$$
   Any agreement whose participant shares do not sum to exactly 10,000 is rejected with `InvalidBasisPointsTotal`.

2. **Integer Division Remainder Handling:**
   When dividing indivisible units (e.g. 10,001 stroops across three equal 33.33% / 33.34% splits):
   $$\text{allocated}_i = \left\lfloor \frac{\text{distributable} \times \text{bps}_i}{10,000} \right\rfloor$$
   $$\text{remainder} = \text{distributable} - \sum_{i=1}^{n} \text{allocated}_i$$

   The contract automatically routes $\text{remainder}$ to the `creator` address during distribution.
   $$\sum \text{allocated} + \text{remainder} \equiv \text{distributable}$$
   This proves that **zero stroops remain unaccounted for or locked in contract escrow**.

---

## 6. Token Integration (SEP-41 / SAC)

The contract interfaces with Stellar Asset Contracts via `soroban_sdk::token::Client`:

- **Deposits:**
  ```rust
  let client = token::Client::new(&env, &agreement.token);
  client.transfer(&payer, &env.current_contract_address(), &amount);
  ```
- **Distributions:**
  ```rust
  client.transfer(&env.current_contract_address(), &participant.address, &payout);
  ```

---

## 7. Event Emission Specification

All state transitions emit structured Soroban topics and data for indexers and RPC event streaming:

| Event Topic             | Topics                                                      | Data Payload                              |
| :---------------------- | :---------------------------------------------------------- | :---------------------------------------- |
| `agreement_created`     | `(Symbol("agreement_created"), agreement_id, creator)`      | `(track_id, token, participant_count)`    |
| `agreement_approved`    | `(Symbol("agreement_approved"), agreement_id, participant)` | `(approval_count, total_participants)`    |
| `agreement_activated`   | `(Symbol("agreement_activated"), agreement_id)`             | `(timestamp)`                             |
| `escrow_deposited`      | `(Symbol("escrow_deposited"), agreement_id, payer)`         | `(amount, total_deposited)`               |
| `royalties_distributed` | `(Symbol("royalties_distributed"), agreement_id, caller)`   | `(amount_distributed, total_distributed)` |
| `agreement_cancelled`   | `(Symbol("agreement_cancelled"), agreement_id, caller)`     | `(timestamp)`                             |

---

## 8. Error Codes (`ContractError`)

| Code | Error Name                   | Meaning                                         |
| :--: | :--------------------------- | :---------------------------------------------- |
|  1   | `AgreementAlreadyExists`     | Agreement ID conflict                           |
|  2   | `AgreementNotFound`          | Agreement record not found                      |
|  3   | `InvalidBasisPointsTotal`    | Allocation does not sum to 10,000 bps           |
|  4   | `NoParticipants`             | Participants list is empty                      |
|  5   | `ParticipantAlreadyApproved` | Collaborator already approved                   |
|  6   | `NotAParticipant`            | Signer is not listed in agreement               |
|  7   | `AgreementNotActive`         | Agreement is not in Active state                |
|  8   | `AgreementAlreadyActive`     | Agreement has already transitioned to Active    |
|  9   | `InvalidAmount`              | Deposit/payout amount $\le 0$                   |
|  10  | `InsufficientBalance`        | Insufficient escrow balance for payout          |
|  11  | `Unauthorized`               | Caller lacks permission for requested action    |
|  12  | `AgreementCannotBeCancelled` | Cannot cancel active or funded agreement        |
|  13  | `AlreadyCancelled`           | Agreement is already cancelled                  |
|  14  | `DuplicateParticipant`       | Same participant address appears multiple times |
|  15  | `Overflow`                   | Numeric overflow in arithmetic                  |
|  16  | `Underflow`                  | Numeric underflow in arithmetic                 |
|  17  | `TokenTransferFailed`        | SAC token invocation failed                     |
|  18  | `InvalidStatusTransition`    | Illegal lifecycle state transition              |
|  19  | `ContractNotInitialized`     | Contract state uninitialized                    |
