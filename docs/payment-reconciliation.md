# FairTune Payment Reconciliation & Financial Invariants

## 1. Overview & Purpose

The **Payment Reconciliation Service** audits FairTune's internal database records against live, authoritative on-chain data from Stellar Soroban.

Reconciliation strictly follows **deterministic mathematical rules**. AI is never used to determine whether numerical records match.

---

## 2. Enforced Financial Invariants

| Invariant # | Invariant Rule                                                                                                             | Severity if Violated | Status Transition |
| :---------: | :------------------------------------------------------------------------------------------------------------------------- | :------------------: | :---------------: |
|    **1**    | Total distributed funds must never exceed total deposited funds ($D \le E$).                                               |      `CRITICAL`      | `PENDING_REVIEW`  |
|    **2**    | Observed on-chain escrow balance must equal deposited minus distributed ($B = E - D$).                                     |        `HIGH`        | `PENDING_REVIEW`  |
|    **3**    | Database confirmed deposits must match on-chain deposits ($E_{\text{db}} = E_{\text{chain}}$).                             |        `HIGH`        |   `MISMATCHED`    |
|    **4**    | Database confirmed collaborator payments must equal on-chain distributions ($P_{\text{db}} = D_{\text{chain}}$).           |        `HIGH`        |   `MISMATCHED`    |
|    **5**    | Collaborator payouts must correspond to agreed basis points within integer rounding tolerance ($\le 50 \text{ subunits}$). |       `MEDIUM`       |   `MISMATCHED`    |
|    **6**    | Payment recipient address must strictly match collaborator's registered `walletAddress`.                                   |      `CRITICAL`      | `PENDING_REVIEW`  |
|    **7**    | No duplicate payment records within the same transaction hash.                                                             |      `CRITICAL`      | `PENDING_REVIEW`  |

---

## 3. Reconciliation Report Structure & Statuses

Reconciliation reports produce one of four statuses:

- **`MATCHED`**: All deterministic invariants verified with 0 discrepancies.
- **`INCOMPLETE`**: Escrow has remaining undistributed balance awaiting distribution, with zero errors.
- **`MISMATCHED`**: Differences detected between database records and on-chain state (e.g. pending sync).
- **`PENDING_REVIEW`**: High or critical discrepancies detected requiring human investigation.

### Sample Reconciliation Report Payload

```json
{
  "reconciliationId": "rec-uuid-1",
  "agreementId": "agr-uuid-1",
  "status": "MATCHED",
  "expectedBalance": "0.0000000",
  "observedOnChainBalance": "0.0000000",
  "totalDeposited": "100.0000000",
  "totalDistributed": "100.0000000",
  "discrepancyCount": 0,
  "findings": [],
  "reconciledAt": "2026-11-24T14:00:00.000Z"
}
```

---

## 4. API Endpoints

- `POST /api/v1/reconciliation/agreements/:agreementId`: Run on-demand reconciliation audit.
- `GET /api/v1/reconciliation/agreements/:agreementId`: Get latest reconciliation audit report.
- `GET /api/v1/reconciliation/history`: List historical reconciliation reports.
- `GET /api/v1/reconciliation/discrepancies`: List all unresolved discrepancy findings.
