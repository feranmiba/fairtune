# FairTune API Specification (v1)

## 1. Conventions

- **Base URL:** `/api/v1`
- **Swagger Documentation:** `/api/docs`
- **Authentication:** Bearer JWT in the `Authorization` header (`Bearer <access_token>`).
- **Standard Response Envelope:**

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation",
  "timestamp": "2026-11-18T19:00:00.000Z"
}
```

- **Error Response Envelope (RFC 7807):**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-11-18T19:00:00.000Z",
  "path": "/api/v1/royalty-agreements",
  "details": [ ... ]
}
```

---

## 2. Endpoints Catalog

### 2.1 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/register`

Creates a new user and artist profile.

- **Access:** Public

#### `POST /api/v1/auth/login`

Authenticates user with email and password.

- **Access:** Public

#### `POST /api/v1/auth/refresh`

Rotates refresh token and returns a new access token.

- **Access:** Public (valid refresh token required)

#### `POST /api/v1/auth/logout`

Revokes active refresh token and invalidates session.

- **Access:** Authenticated

#### `GET /api/v1/auth/me`

Retrieves currently authenticated user and active roles.

- **Access:** Authenticated

---

### 2.2 Users & Profiles (`/api/v1/users`)

#### `GET /api/v1/users/me`

Fetches complete user profile including linked artist profile.

- **Access:** Authenticated

#### `PATCH /api/v1/users/me`

Updates user name, bio, stage name, or country.

- **Access:** Authenticated

---

### 2.3 Documents (`/api/v1/documents`)

#### `POST /api/v1/documents`

Uploads a music contract PDF.

- **Access:** Authenticated
- **Content-Type:** `multipart/form-data`
- **Fields:** `file` (PDF up to 10MB), `title`

#### `GET /api/v1/documents`

Lists user's uploaded documents with processing status.

- **Access:** Authenticated

#### `GET /api/v1/documents/:id`

Retrieves document metadata by ID.

- **Access:** Authenticated (Owner only)

#### `GET /api/v1/documents/:id/status`

Retrieves real-time processing status (`UPLOADED` -> `PROCESSING` -> `EXTRACTED` -> `READY` / `FAILED`), page count, and error messages.

- **Access:** Authenticated (Owner only)

#### `GET /api/v1/documents/:id/text`

Retrieves full extracted text, page count, and segmented text chunks.

- **Access:** Authenticated (Owner only)

#### `POST /api/v1/documents/:id/retry`

Retries text extraction and embedding generation for a previously failed document.

- **Access:** Authenticated (Owner only)

#### `DELETE /api/v1/documents/:id`

Deletes document record and underlying stored contract.

- **Access:** Authenticated (Owner only)

---

### 2.4 Contract Intelligence (`/api/v1/contract-analysis`)

#### `POST /api/v1/contract-analysis/:documentId`

Triggers AI contract analysis, extracts clauses, stores findings, and generates vector embeddings.

- **Access:** Authenticated (Owner only)

#### `GET /api/v1/contract-analysis/:id`

Retrieves structured contract analysis results, clause breakdowns, and risk assessments by analysis ID.

- **Access:** Authenticated (Owner only)

#### `GET /api/v1/contract-analysis/document/:documentId`

Retrieves structured contract analysis results and risk assessment by document ID.

- **Access:** Authenticated (Owner only)

#### `POST /api/v1/contract-analysis/compare`

Compares two contract versions, identifying added, removed, and modified clauses with plain-English artist impact classification.

- **Access:** Authenticated (Owner of both documents)
- **Request Body:**
  ```json
  {
    "sourceDocumentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "targetDocumentId": "7cb42f12-9213-4122-a12b-3c963f77dfb2",
    "comparisonFocus": ["ROYALTIES", "RIGHTS_TRANSFER", "TERMINATION"]
  }
  ```

---

### 2.5 Contract Negotiation Copilot (`/api/v1/negotiation`)

#### `POST /api/v1/negotiation/conversations`

Initializes a new negotiation conversation, optionally grounded in an uploaded contract.

- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "documentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "title": "Universal Contract Negotiation",
    "initialMessage": "What are the major red flags in this publishing deal?"
  }
  ```

#### `GET /api/v1/negotiation/conversations`

Lists all active negotiation conversations for the authenticated artist.

- **Access:** Authenticated

#### `GET /api/v1/negotiation/conversations/:id`

Retrieves conversation history, messages, and linked contract source citations.

- **Access:** Authenticated (Owner only)

#### `POST /api/v1/negotiation/conversations/:id/messages`

Sends a message to the AI Negotiation Copilot with contract-grounded context.

- **Access:** Authenticated (Owner only)
- **Request Body:**
  ```json
  {
    "content": "Can you give me counter-clause language for the master rights assignment?",
    "referencedClauseIds": ["9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"]
  }
  ```

#### `GET /api/v1/negotiation/conversations/:id/stream`

Streams AI negotiation responses via Server-Sent Events (SSE) with real-time token chunks and citation attribution metadata.

- **Access:** Authenticated (Owner only)
- **Query Parameters:** `content` (prompt/question)

#### `POST /api/v1/negotiation/conversations/:id/stream`

Streams AI negotiation responses via Server-Sent Events (SSE) with JSON payload support.

- **Access:** Authenticated (Owner only)
- **Request Body:** `SendAIMessageInput`

---

### 2.6 AI Royalty Intelligence (`/api/v1/royalty-intelligence`)

#### `POST /api/v1/royalty-intelligence/simulate`

Simulates music revenue distribution with decimal-accurate arithmetic and recoupment waterfall calculations.

- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "grossRevenue": 10000,
    "recoupableExpenses": 2500,
    "currency": "USD",
    "participants": [
      { "collaboratorName": "Producer", "role": "Producer", "percentage": 40.0 },
      { "collaboratorName": "Songwriter", "role": "Songwriter", "percentage": 60.0 }
    ]
  }
  ```

#### `POST /api/v1/royalty-intelligence/simulate/save`

Calculates and persists a royalty split simulation for future reference.

- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "title": "Single Release Waterfall",
    "grossRevenue": 10000,
    "recoupableExpenses": 2500,
    "currency": "USD",
    "participants": [
      { "collaboratorName": "Producer", "role": "Producer", "percentage": 40.0 },
      { "collaboratorName": "Songwriter", "role": "Songwriter", "percentage": 60.0 }
    ]
  }
  ```

#### `GET /api/v1/royalty-intelligence/simulations`

Lists all saved royalty simulations for the current user.

- **Access:** Authenticated

#### `GET /api/v1/royalty-intelligence/simulations/:id`

Retrieves a specific saved royalty simulation by ID.

- **Access:** Authenticated (Owner only)

#### `POST /api/v1/royalty-intelligence/forecast`

Models forward revenue projections based on historical earnings, strictly separating factual historical data from mathematical estimates with explicit disclaimers.

- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "title": "2026 Streaming Projection",
    "historicalPeriods": [
      { "period": "2025-Q1", "actualGrossRevenue": 8000, "actualRecouped": 2000 },
      { "period": "2025-Q2", "actualGrossRevenue": 10000, "actualRecouped": 0 }
    ],
    "projectedGrowthRatePercent": 15,
    "projectionPeriodsCount": 4,
    "currency": "USD",
    "participants": [
      { "collaboratorName": "Artist", "role": "Vocalist", "percentage": 70.0 },
      { "collaboratorName": "Producer", "role": "Producer", "percentage": 30.0 }
    ]
  }
  ```

#### `GET /api/v1/royalty-intelligence/anomalies/:agreementId`

Inspects a royalty agreement and on-chain records for split mismatches, pending unapproved participants, and duplicate hashes.

- **Access:** Authenticated (Creator or Participant)

---

### 2.7 AI Music Rights Intelligence (`/api/v1/rights-intelligence`)

#### `POST /api/v1/rights-intelligence/extract/:documentId`

Extracts track titles, featured artists, producers, songwriters, and publishing ownership shares from a contract.

- **Access:** Authenticated (Owner only)

---

### 2.8 Royalty Agreements (`/api/v1/royalty-agreements`)

#### `POST /api/v1/royalty-agreements`

Creates a royalty agreement with participant allocations. Validates that participant shares sum to exactly 100.00%.

- **Access:** Authenticated

#### `GET /api/v1/royalty-agreements`

Lists all royalty agreements created by or involving the current user.

- **Access:** Authenticated

#### `GET /api/v1/royalty-agreements/:id`

Retrieves agreement details, participant statuses, and linked Stellar transactions.

- **Access:** Authenticated

---

### 2.9 Stellar Blockchain & Soroban (`/api/v1/stellar`)

For full request/response schemas and payload examples, refer to [stellar-api.md](file:///Users/user/fairtune/docs/stellar-api.md).

#### `GET /api/v1/stellar/network/status`

Retrieves Stellar Testnet status, Horizon version, and Soroban RPC connectivity.

- **Access:** Public

#### `GET /api/v1/stellar/accounts/:publicKey`

Validates Stellar public key format (`G...`) and retrieves live account balances and sequence.

- **Access:** Authenticated

#### `POST /api/v1/stellar/accounts/friendbot`

Funds a testnet account using Stellar Friendbot.

- **Access:** Authenticated

#### `GET /api/v1/stellar/contracts/config`

Returns configured Soroban royalty agreement contract ID and RPC endpoint.

- **Access:** Authenticated

#### `GET /api/v1/stellar/contracts/agreement/:agreementId`

Reads live on-chain state for a given numeric agreement ID directly from Soroban RPC.

- **Access:** Authenticated

#### `POST /api/v1/stellar/transactions/prepare-create-agreement`

Builds and simulates an unsigned XDR envelope for creating a royalty agreement on Soroban.

- **Access:** Authenticated

#### `POST /api/v1/stellar/transactions/prepare-approve-agreement`

Builds and simulates an unsigned XDR envelope for collaborator approval.

- **Access:** Authenticated

#### `POST /api/v1/stellar/transactions/prepare-deposit-escrow`

Builds and simulates an unsigned XDR envelope for depositing tokens into contract escrow.

- **Access:** Authenticated

#### `POST /api/v1/stellar/transactions/prepare-distribute-royalties`

Builds and simulates an unsigned XDR envelope for atomic royalty distribution.

- **Access:** Authenticated

#### `POST /api/v1/stellar/transactions/prepare-cancel-agreement`

Builds and simulates an unsigned XDR envelope for cancelling an agreement before approval.

- **Access:** Authenticated

#### `POST /api/v1/stellar/transactions/simulate`

Simulates a transaction XDR envelope against Soroban RPC to calculate required resource fees and footprints.

- **Access:** Authenticated

#### `POST /api/v1/stellar/transactions/submit`

Submits a client-signed XDR transaction to Soroban RPC, polls ledger finality, and records audit history.

- **Access:** Authenticated

#### `GET /api/v1/stellar/transactions/:hash`

Verifies submitted Stellar transaction hash on-chain.

- **Access:** Authenticated

#### `POST /api/v1/stellar/agreements/:agreementId/sync`

Reconciles on-chain Soroban agreement state to PostgreSQL models.

- **Access:** Authenticated

---

### 2.10 Payments & Assets (`/api/v1/payments`)

#### `POST /api/v1/payments/assets`

Registers a new token asset contract in the registry.

- **Access:** Authenticated

#### `GET /api/v1/payments/assets`

Lists all active registered payment assets.

- **Access:** Authenticated

#### `GET /api/v1/payments/assets/:id`

Retrieves metadata for a specific payment asset by ID.

- **Access:** Authenticated

#### `GET /api/v1/payments`

Lists paginated payment history with filters by agreement, collaborator, status, or recipient.

- **Access:** Authenticated

#### `GET /api/v1/payments/:id`

Retrieves payment details, on-chain transaction hash, and ledger confirmation sequence.

- **Access:** Authenticated

#### `GET /api/v1/payments/agreements/:agreementId`

Retrieves all collaborator payments executed under an agreement.

- **Access:** Authenticated

#### `GET /api/v1/payments/collaborators/:collaboratorId`

Retrieves all payments received by a collaborator.

- **Access:** Authenticated

---

### 2.11 Blockchain Monitoring (`/api/v1/monitoring`)

#### `GET /api/v1/monitoring/status`

Retrieves Soroban event monitoring status, cursor ledger sequence, and RPC health.

- **Access:** Authenticated

#### `POST /api/v1/monitoring/sync`

Triggers an immediate polling pass of contract events since the last ledger checkpoint.

- **Access:** Authenticated (Admin/Artist)

---

### 2.12 Payment Reconciliation (`/api/v1/reconciliation`)

#### `POST /api/v1/reconciliation/agreements/:agreementId`

Executes a deterministic reconciliation audit comparing on-chain escrow/distribution vs database payments.

- **Access:** Authenticated

#### `GET /api/v1/reconciliation/agreements/:agreementId`

Retrieves the latest reconciliation audit report for an agreement.

- **Access:** Authenticated

#### `GET /api/v1/reconciliation/history`

Lists historical reconciliation reports.

- **Access:** Authenticated

#### `GET /api/v1/reconciliation/discrepancies`

Lists all unresolved discrepancy findings across authorized agreements.

- **Access:** Authenticated

---

### 2.13 Notifications (`/api/v1/notifications`)

#### `GET /api/v1/notifications`

Lists notifications for the current authenticated user.

- **Access:** Authenticated

#### `PATCH /api/v1/notifications/:id/read`

Marks a notification as read.

- **Access:** Authenticated

#### `POST /api/v1/notifications/read-all`

Marks all notifications as read for the user.

- **Access:** Authenticated

---

### 2.14 Health Check (`/api/v1/health`)

#### `GET /api/v1/health`

Health check verifying PostgreSQL, Redis, and API service responsiveness.

- **Access:** Public
