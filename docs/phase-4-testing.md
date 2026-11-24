# FairTune Phase 4 Testing & Verification Guide

## 1. Test Suite Summary

Phase 4 testing covers:

- **Payment Asset Service**: Integer subunit conversion, decimals handling, asset registration.
- **Payments Service**: Idempotent payment recording, confirmation, rejection, and role-based access.
- **Payment Sync Service**: Soroban contract event ingestion (`agree:approved`, `agree:active`, `escrow:deposit`, `royalty:distrib`, `agree:cancel`), multi-party basis point distribution, dust remainder routing.
- **Stellar Monitoring Service**: Checkpoint persistence, restart recovery, Soroban RPC event polling.
- **Payment Reconciliation Service**: Deterministic invariant validation, over-distribution detection, address mismatch detection.
- **Royalty Analytics & Forecasting**: Factual payment aggregation by track/collaborator/asset, forward estimates with confidence scoring.
- **Anomaly Detection & Review**: Deterministic rule suite, AI explanation generation, human review workflow.
- **AI Royalty Tools**: Read-only tools for natural language copilot questions.
- **Notification Service**: Dispatching, listing, and marking read.

---

## 2. Running Automated Tests

### 2.1 Run All Backend Unit & Integration Tests

```bash
pnpm --filter @fairtune/api test
```

Result: **28 test suites passed, 126 tests passed**.

### 2.2 Run Specific Phase 4 Suites

```bash
# Payments & Assets
pnpm --filter @fairtune/api test apps/api/src/modules/payments/

# Monitoring & Event Sync
pnpm --filter @fairtune/api test apps/api/src/modules/monitoring/

# Reconciliation & Invariants
pnpm --filter @fairtune/api test apps/api/src/modules/reconciliation/

# Royalty Analytics, Forecasting & Anomalies
pnpm --filter @fairtune/api test apps/api/src/modules/royalty-intelligence/

# AI Tools
pnpm --filter @fairtune/api test apps/api/src/modules/ai/tools/implementations/royalty-tools.spec.ts

# Notifications
pnpm --filter @fairtune/api test apps/api/src/modules/notifications/
```

### 2.3 Run Soroban Smart Contract Tests (Rust)

```bash
cargo test --manifest-path contracts/royalty-agreement/Cargo.toml
```

Result: **7 passed, 0 failed**.

---

## 3. End-to-End Workflow Verification on Stellar Testnet

1. **Deploy Contract / Configure Asset:**
   Register payment token asset in registry (`POST /api/v1/payments/assets`).
2. **Create Agreement & Collaborator Approvals:**
   Build unsigned creation XDR $\rightarrow$ sign with wallet $\rightarrow$ submit.
   Collaborators sign approval XDR $\rightarrow$ submit $\rightarrow$ status transitions to `ACTIVE`.
3. **Deposit Escrow:**
   Distributor signs escrow deposit XDR $\rightarrow$ Soroban emits `escrow:deposit` $\rightarrow$ `PaymentSyncService` records deposit transaction and updates agreement to `FUNDED`.
4. **Distribute Royalties:**
   Participant signs distribution XDR $\rightarrow$ Soroban executes atomic payments and emits `royalty:distrib` $\rightarrow$ `PaymentSyncService` creates individual `Payment` records for each collaborator $\rightarrow$ notifications dispatched.
5. **Reconciliation Audit:**
   `POST /api/v1/reconciliation/agreements/:id` $\rightarrow$ verifies on-chain vs database state $\rightarrow$ returns `MATCHED` with 0 discrepancies.
6. **AI Inquiries:**
   Ask AI Assistant: _"How much have I earned from Midnight Groove?"_ $\rightarrow$ AI invokes `retrieve_royalty_earnings` and returns exact, cited on-chain earnings.
