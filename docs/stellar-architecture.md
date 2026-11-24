# FairTune Stellar & Soroban Architecture

## 1. Executive Summary

FairTune leverages the Stellar network and Soroban smart contracts to provide transparent, verifiable, and enforceable royalty management for independent music creators and their collaborators.

While FairTune's AI engine extracts, analyzes, and explains complex music contracts off-chain, the platform anchors financial agreements and royalty distribution on the Stellar blockchain. This hybrid design guarantees that financial execution is non-custodial, deterministic, and auditable while maintaining high throughput and low costs.

```
                      ┌───────────────────────────────────────────────┐
                      │              FairTune Web (UI)                │
                      │  - Non-Custodial Wallet (Freighter / Albedo)  │
                      │  - Signs unsigned XDR locally                 │
                      └──────────────────────┬────────────────────────┘
                                             │
                       1. Request XDR        │ 3. Submit Signed XDR
                       (POST /stellar/tx/*)  │ (POST /stellar/tx/submit)
                                             │
                                             ▼
                      ┌───────────────────────────────────────────────┐
                      │         NestJS Backend (apps/api)             │
                      │                                               │
                      │   ┌─────────────────────────────────────────┐ │
                      │   │ TransactionBuilderService               │ │
                      │   │ - Build contract call operations        │ │
                      │   │ - Assemble resource fees & footprints   │ │
                      │   │ - Generate unsigned base64 XDR          │ │
                      │   └────────────────────┬────────────────────┘ │
                      │                        │                      │
                      │   ┌────────────────────▼────────────────────┐ │
                      │   │ AgreementSyncService                    │ │
                      │   │ - Submit signed tx to Soroban RPC       │ │
                      │   │ - Poll ledger transaction status        │ │
                      │   │ - Reconcile on-chain state to Prisma DB │ │
                      │   └────────────────────┬────────────────────┘ │
                      └────────────────────────┼──────────────────────┘
                                               │
                        Soroban RPC / Horizon  │ JSON-RPC & REST
                                               ▼
                      ┌───────────────────────────────────────────────┐
                      │          Stellar Testnet Network              │
                      │                                               │
                      │   ┌───────────────────────────────────────┐   │
                      │   │ Soroban Royalty Agreement Contract    │   │
                      │   │ - Multi-party approvals               │   │
                      │   │ - Token escrow custody                │   │
                      │   │ - Atomic integer distribution         │   │
                      │   │ - Cryptographic events                │   │
                      │   └───────────────────────────────────────┘   │
                      └───────────────────────────────────────────────┘
```

---

## 2. Non-Custodial Security Model

FairTune strictly adheres to a **non-custodial security architecture**:

1. **Zero Secret Key Custody:** Neither the NestJS API, worker queues, nor database ever handle, store, or receive user secret keys (`S...`).
2. **Client-Side Signing:** All state-changing transactions are signed in the user's browser wallet (e.g., Freighter, Albedo) using hardware or local key isolation.
3. **Unsigned XDR Preparation:** The backend functions purely as an orchestration engine:
   - Fetches target account sequence numbers and balances.
   - Prepares the Soroban contract call operation.
   - Simulates the transaction against Soroban RPC to resolve ledger footprints and resource fee requirements.
   - Assembles the complete unsigned transaction XDR envelope using `rpc.assembleTransaction`.
   - Returns the unsigned envelope to the client for signature.
4. **Broadcast & Verification:** Once signed by the user, the signed XDR is submitted to the backend `/api/v1/stellar/transactions/submit` endpoint (or directly by the client to Soroban RPC). The backend validates ledger finality before updating PostgreSQL.

---

## 3. Off-Chain vs. On-Chain Separation of Concerns

To optimize costs, privacy, and performance, FairTune cleanly separates responsibilities:

| Domain                        | Layer     | Storage / Execution                   | Rationale                                                                                                          |
| :---------------------------- | :-------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| **Contract Text & Documents** | Off-Chain | PostgreSQL & S3-compatible Blob Store | Large file storage and legal PDF text are cost-prohibitive on-chain.                                               |
| **AI Contract Intelligence**  | Off-Chain | NestJS AI Agents + pgvector           | Complex LLM evaluation, clause extraction, and embeddings occur server-side.                                       |
| **Draft Agreements**          | Off-Chain | PostgreSQL (`RoyaltyAgreement`)       | Collaborators can iteratively draft, negotiate, and edit splits before deployment.                                 |
| **Agreement Integrity Hash**  | On-Chain  | Soroban Storage (`metadata_hash`)     | SHA-256 hash of the finalized agreement text cryptographically pins the off-chain terms to the on-chain agreement. |
| **Collaborator Approvals**    | On-Chain  | Soroban Multi-Auth (`require_auth`)   | Each collaborator explicitly signs their on-chain approval before escrow is accepted.                              |
| **Royalty Escrow & Payouts**  | On-Chain  | Stellar Asset Contract (SAC) / SEP-41 | Funds are locked in smart contract custody and distributed atomically to wallet addresses.                         |

---

## 4. Soroban Smart Contract Architecture

The core contract is implemented in Rust (`contracts/royalty-agreement/`):

### 4.1 Agreement State Machine

An agreement progresses through deterministic states:

```
                  ┌──────────────────────┐
                  │   PendingApproval    │
                  └──────────┬───────────┘
                             │ All collaborators approve
                             ▼
                  ┌──────────────────────┐
                  │        Active        │ ◄─────────────────────────┐
                  └──────────┬───────────┘                           │
                             │ Escrow deposited                      │ All funds
                             ▼                                       │ distributed
                  ┌──────────────────────┐                           │
                  │        Funded        ├───────────────────────────┘
                  └──────────┬───────────┘
                             │ Creator cancels (only if no funds deposited)
                             ▼
                  ┌──────────────────────┐
                  │      Cancelled       │
                  └──────────────────────┘
```

1. **`PendingApproval`**: Agreement is created. Collaborators must invoke `approve_agreement`.
2. **`Active`**: Once the final required collaborator approves, the contract automatically activates the agreement. Deposits are now permitted.
3. **`Funded`**: Payer or distributor deposits funds into contract escrow via `deposit_escrow`.
4. **`Active` (Recurrent)**: Royalties are distributed via `distribute_royalties`. If remaining balance is zero, status returns to `Active` awaiting further revenue.
5. **`Cancelled`**: Allowed only by the creator when status is `PendingApproval` and zero funds have ever been deposited.

### 4.2 Integer Arithmetic and Zero-Leak Remainder Guarantees

All financial calculations use `i128` integer arithmetic with basis points ($10,000 \text{ bps} = 100\%$):

- Maximum total basis points across participants: strictly $10,000$.
- Distribution formula:
  $$\text{payout}_i = \frac{\text{amount} \times \text{bps}_i}{10,000}$$
- **Remainder Invariant:**
  $$\text{remainder} = \text{amount} - \sum_{i=1}^n \text{payout}_i$$
  Any integer division remainder is transferred to the agreement creator. This ensures that:
  $$\sum \text{allocated}_i + \text{remainder} \equiv \text{amount}$$
  Zero stroops/subunits are ever trapped or leaked inside contract storage.

---

## 5. Backend Service Architecture

The NestJS Stellar module (`apps/api/src/modules/stellar/`) consists of 7 specialized services:

1. **`StellarNetworkService`**: Manages Horizon and Soroban RPC connections, network passphrases, and health checks.
2. **`StellarAccountService`**: Validates Stellar public keys (`G...`), checks testnet account funding, and fetches balances.
3. **`StellarTransactionService`**: Horizon-based verification and fee estimation for native payments.
4. **`SorobanContractService`**: Simulates read-only contract calls (`get_agreement`, `get_agreement_status`, `get_undistributed_balance`) via RPC.
5. **`TransactionBuilderService`**: Builds unsigned XDR envelopes for `create_agreement`, `approve_agreement`, `deposit_escrow`, `distribute_royalties`, and `cancel_agreement`.
6. **`TransactionSimulationService`**: Simulates transactions and extracts required CPU/memory resources, authorization entries, and expected return values.
7. **`AgreementSyncService`**: Submits signed transactions to Soroban RPC, polls ledger status, records audit logs in PostgreSQL (`Transaction`), and reconciles on-chain status with off-chain models.

---

## 6. End-to-End Workflow

1. **Creation**: Artist finalizes royalty agreement in FairTune UI $\rightarrow$ calls `POST /stellar/transactions/prepare-create-agreement` $\rightarrow$ signs XDR $\rightarrow$ submits signed XDR $\rightarrow$ Soroban emits `agreement_created` $\rightarrow$ Postgres records `onChainAgreementId`.
2. **Collaborator Approval**: Collaborator views agreement $\rightarrow$ calls `POST /stellar/transactions/prepare-approve-agreement` $\rightarrow$ signs XDR $\rightarrow$ submits signed XDR $\rightarrow$ Soroban emits `agreement_approved` (and `agreement_activated` if final approval) $\rightarrow$ Postgres updates collaborator approval.
3. **Escrow Deposit**: Royalty distributor/DSP calls `POST /stellar/transactions/prepare-deposit-escrow` $\rightarrow$ signs XDR $\rightarrow$ submits signed XDR $\rightarrow$ SAC tokens transfer into contract $\rightarrow$ contract emits `escrow_deposited`.
4. **Royalty Distribution**: Any participant triggers `POST /stellar/transactions/prepare-distribute-royalties` $\rightarrow$ signs XDR $\rightarrow$ submits signed XDR $\rightarrow$ contract atomically transfers token payouts to each collaborator wallet and remainder to creator $\rightarrow$ contract emits `royalties_distributed` $\rightarrow$ Postgres updates transaction history.
