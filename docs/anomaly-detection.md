# FairTune Anomaly Detection & Investigation Workflow

## 1. Overview

FairTune's Anomaly Detection engine combines **deterministic rule evaluation** with **AI-powered plain-English explanations** to surface irregularities, state inconsistencies, and financial discrepancies in music royalty management.

---

## 2. Deterministic Detection Rules

### 2.1 Payment Anomalies

- `DUPLICATE_PAYMENT_TX`: Multiple confirmed payment records for the same recipient in a single transaction.
- `PAYMENTS_ON_INACTIVE_AGREEMENT`: Confirmed payments recorded against an agreement that is not `ACTIVE`.
- `PAYMENT_DESTINATION_MISMATCH`: Payment transferred to an address differing from collaborator's registered wallet.

### 2.2 Agreement Anomalies

- `INVALID_SPLIT_TOTAL`: Collaborator allocations do not total exactly 100.00%.
- `ACTIVE_WITH_PENDING_APPROVALS`: Agreement marked `ACTIVE` while collaborators remain in `PENDING` approval.
- `DUPLICATE_COLLABORATOR_ADDRESS`: The same wallet address appears multiple times in the participant roster.

### 2.3 Financial Invariants

- `DISTRIBUTION_EXCEEDS_ESCROW`: Cumulative distributions exceed confirmed escrow deposits.

---

## 3. AI Plain-Language Explanations

Once a discrepancy is flagged deterministically, the AI Provider generates an objective explanation and recommended resolution steps.

### Safety Guardrails

- **Neutral Tone**: The AI never accuses any party of fraud, theft, or misconduct.
- **Root Cause Grounding**: Identifies whether the issue is a data entry omission, pending ledger sync, or arithmetic discrepancy.
- **Actionable Steps**: Recommends practical investigation steps (e.g. verifying on-chain ledger sequence, requesting collaborator approval).

---

## 4. Human-in-the-Loop Review Workflow

Anomalies transition through review states under user or auditor oversight:

- **`PENDING`**: Newly detected finding.
- **`IN_REVIEW`**: User or auditor is actively investigating.
- **`RESOLVED`**: Discrepancy rectified (e.g. on-chain split updated).
- **`FALSE_POSITIVE`**: Verified as benign or expected.

### Audit Log (`AnomalyReview`)

Every status transition records an immutable audit log storing `reviewerId`, `previousStatus`, `newStatus`, `notes`, and `createdAt`.
