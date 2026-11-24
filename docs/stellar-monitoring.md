# FairTune Stellar Transaction Monitoring & Event Synchronization

## 1. Overview

FairTune implements a background event monitoring service that continuously ingests on-chain contract events from the Stellar Soroban RPC, resolves event state, and idempotently records verified transaction outcomes into PostgreSQL.

```
                      ┌──────────────────────────────────────────────┐
                      │              Soroban RPC Server              │
                      │  - server.getEvents({ startLedger, ... })    │
                      │  - Contract events: deposit, distrib, etc.   │
                      └──────────────────────┬───────────────────────┘
                                             │ Poll Events
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │         StellarMonitoringService             │
                      │  - Manages StellarMonitoringCheckpoint       │
                      │  - Recovers from restarts & RPC errors       │
                      │  - Advances ledger sequence cursor           │
                      └──────────────────────┬───────────────────────┘
                                             │ Contract Events
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │            PaymentSyncService                │
                      │  - Decodes ScVal topics & payloads           │
                      │  - Idempotent upsert of Payment records      │
                      │  - Emits in-app Notification events          │
                      └──────────────────────────────────────────────┘
```

---

## 2. Checkpoint Persistence & Restart Recovery

To guarantee that no events are missed across application restarts or temporary RPC network outages:

1. **Persistent Checkpoint Table (`StellarMonitoringCheckpoint`):**
   Stores `contractAddress`, `lastLedgerSequence`, and `lastPagingToken`.
2. **Dynamic Range Determination:**
   $$\text{startLedger} = \text{checkpoint.lastLedgerSequence} + 1$$
   If initializing for the first time, `startLedger` begins safely near current ledger ($\max(1, \text{latestLedger} - 100)$) to remain within Soroban RPC's retention horizon.
3. **Atomic Progress Updates:**
   The checkpoint cursor advances in the database only after each event is successfully handled by `PaymentSyncService`.

---

## 3. Supported Soroban Contract Events

| Domain    | Action     | Topics                       | Data Payload                 | Handler Action                                                                                                     |
| :-------- | :--------- | :--------------------------- | :--------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `agree`   | `approved` | `["agree", "approved", id]`  | `collaborator_address`       | Marks collaborator `onChainApproved = true`                                                                        |
| `agree`   | `active`   | `["agree", "active", id]`    | `agreement_id`               | Sets agreement status to `ACTIVE`                                                                                  |
| `escrow`  | `deposit`  | `["escrow", "deposit", id]`  | `[depositor, amount]`        | Updates status to `FUNDED`, records deposit tx, notifies creator                                                   |
| `royalty` | `distrib`  | `["royalty", "distrib", id]` | `[total_distrib, remainder]` | Computes collaborator splits, records individual `Payment` records, records remainder to creator, notifies parties |
| `agree`   | `cancel`   | `["agree", "cancel", id]`    | `canceller_address`          | Marks agreement status `CANCELLED`                                                                                 |

---

## 4. Idempotency & Duplicate Event Protection

1. **Unique Compound Constraints:**
   `Payment` records enforce `@@unique([transactionHash, recipientAddress])`.
   `Transaction` records enforce `@unique(transactionHash)`.
2. **Safe Upsert Logic:**
   Reprocessing an existing transaction or event safely updates status without creating duplicate payment entries.
3. **Audit Trail:**
   Every synchronized payment is linked to its on-chain `transactionHash`, `ledgerSequence`, and `confirmedAt` timestamp.
