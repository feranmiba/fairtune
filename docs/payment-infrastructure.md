# FairTune Payment Infrastructure & Asset Registry

## 1. Overview & Architecture

FairTune's payment infrastructure extends the Soroban royalty escrow contract by tracking, confirming, and recording individual collaborator payouts with deterministic precision.

While Soroban smart contracts atomically execute multi-party token transfers on the Stellar ledger, the backend maintains a queryable, auditable, and non-custodial financial ledger in PostgreSQL.

```
                  ┌──────────────────────────────────────────────┐
                  │              FairTune Web (UI)               │
                  │   - Signs Escrow / Payout XDR with Freighter │
                  └──────────────────────┬───────────────────────┘
                                         │ Unsigned / Signed XDR
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            NestJS Payment Module             │
                  │  - PaymentAssetService (Decimals & Registry) │
                  │  - PaymentsService (Payment Records & State) │
                  └──────────────────────┬───────────────────────┘
                                         │
                   ┌─────────────────────┴──────────────────────┐
                   ▼                                            ▼
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│        PostgreSQL Database           │     │          Stellar Soroban RPC         │
│  - Payment (Individual payouts)      │     │  - Token Client (SEP-41 Transfers)   │
│  - PaymentAsset (Configured tokens)  │     │  - Ledger Sequence Finality          │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 2. Payment Lifecycle States

Each collaborator payment record undergoes a deterministic lifecycle:

```
            ┌──────────────┐
            │   PENDING    │ (Payment record initialized; awaiting on-chain submission)
            └───────┬──────┘
                    │
                    ▼
            ┌──────────────┐
            │  PROCESSING  │ (Transaction submitted to Soroban RPC; polling finality)
            └───────┬──────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
┌────────────────┐     ┌────────────────┐
│   CONFIRMED    │     │     FAILED     │
│ (Ledger proof) │     │ (Reverted/Err) │
└────────────────┘     └────────────────┘
```

1. **`PENDING`**: Payment record created during distribution preparation or awaiting event confirmation.
2. **`PROCESSING`**: Signed XDR transaction has been submitted to Soroban RPC and is being confirmed by validators.
3. **`CONFIRMED`**: Stellar transaction finality confirmed on ledger. The payout is verified by on-chain events. Contains `confirmedAt` and `ledgerSequence`.
4. **`FAILED`**: Transaction reverted, failed simulation, or was rejected by network consensus. Contains `failureReason`.
5. **`REVERSED`**: Reserved only for explicit on-chain refund mechanisms.

---

## 3. Configurable Payment Asset Registry

To avoid hardcoding production stablecoin addresses or assuming fixed decimal representations, FairTune implements a dynamic asset registry (`PaymentAsset`):

```prisma
model PaymentAsset {
  id              String         @id @default(uuid())
  code            String         // e.g., "USDC", "XLM"
  name            String         // e.g., "USD Coin"
  contractAddress String         @unique // Soroban SAC address (C...)
  issuerPublicKey String?        // Classic Stellar asset issuer (G...)
  decimals        Int            @default(7)
  network         StellarNetwork @default(TESTNET)
  isActive        Boolean        @default(true)
}
```

### 3.1 Integer Precision & Subunit Arithmetic

All monetary calculations use atomic integer units (stroops/subunits) or `Decimal(18, 7)`:

- Decimal to Subunits:
  $$\text{subunits} = \text{amount} \times 10^{\text{decimals}}$$
  Implemented using string slicing and padding to avoid JavaScript IEEE 754 floating-point drift.
- Subunits to Decimal:
  $$\text{decimal} = \frac{\text{subunits}}{10^{\text{decimals}}}$$

---

## 4. API Endpoints Reference

Base URL: `/api/v1/payments`

| Method | Endpoint                         | Description                                  | Auth |
| :----- | :------------------------------- | :------------------------------------------- | :--- |
| `POST` | `/assets`                        | Register a new token asset contract          | JWT  |
| `GET`  | `/assets`                        | List configured payment assets               | JWT  |
| `GET`  | `/assets/:id`                    | Get asset metadata by ID                     | JWT  |
| `GET`  | `/`                              | List paginated payment records with filters  | JWT  |
| `GET`  | `/:id`                           | Get payment details by ID                    | JWT  |
| `GET`  | `/agreements/:agreementId`       | List all payments for an agreement           | JWT  |
| `GET`  | `/collaborators/:collaboratorId` | List all payments received by a collaborator | JWT  |
