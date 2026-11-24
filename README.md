# FairTune

> **AI-First Music Rights Intelligence & Blockchain Royalty Protection Platform**  
> Built for the Stellar Hackathon.

FairTune decodes complex, opaque music contracts before artists sign, provides an interactive AI Negotiation Copilot with contract-grounded citations, and enforces transparent, non-custodial royalty distribution using Stellar Soroban smart contracts afterward.

---

## 1. Product Context

1. **Pre-Signature (AI Contract Intelligence & Negotiation Copilot):**
   Independent musicians frequently enter into agreements containing predatory clauses (e.g., perpetual copyright assignment, unrecouped expense cross-collateralization, below-market streaming rates). FairTune ingests contracts (PDFs), normalizes legal text, flags risky terms, categorizes clauses, generates semantic vector embeddings, and provides an interactive Negotiation Copilot to clarify language and suggest counter-clauses.

2. **Pre-Agreement (Royalty & Rights Intelligence):**
   Artists can simulate revenue distributions using deterministic decimal-safe calculations, test recoupment scenarios, and extract collaborator ownership credits across documents.

3. **Post-Signature (Stellar Royalty Protection):**
   Collaborators (producers, songwriters, vocalists) collaborate to agree on 100% split allocations. Once agreed, contracts are anchored to Stellar Soroban smart contracts, facilitating transparent, auditable royalty accounting and payouts via Stellar assets.

---

## 2. Technology Stack

- **Package Manager:** `pnpm` (v10)
- **Monorepo Orchestration:** `Turborepo`
- **Backend Framework:** `NestJS` (v10)
- **AI Architecture:** Centralized `AiModule` with provider abstraction (`IAiProvider`), multi-agent system (`ContractAnalysisAgent`, `NegotiationAgent`, `RoyaltyIntelligenceAgent`, `RightsIntelligenceAgent`), and RAG vector embeddings
- **Database & ORM:** `PostgreSQL` + `Prisma ORM`
- **Asynchronous Queues & Cache:** `Redis` + `BullMQ`
- **Authentication:** JWT (short-lived access + rotated refresh tokens) + `Argon2id` password hashing
- **Blockchain:** `@stellar/stellar-sdk` (Horizon + Soroban RPC Testnet)
- **Validation:** `Zod` (Single source of truth across packages)
- **API Documentation:** Swagger / OpenAPI (`/api/docs`)
- **Logging:** `Pino` (Structured JSON logs with sensitive field redaction)
- **Security:** `Helmet`, rate-limiting (`@nestjs/throttler`), secure cookie parser

---

## 3. Monorepo Structure

```text
fairtune/
├── apps/
│   ├── api/                  # NestJS backend API application
│   └── web/                  # Reserved for the React/Next.js frontend (Phase 2)
│
├── packages/
│   ├── shared/               # Shared domain enums, types, and constants
│   ├── config/               # Shared TypeScript, ESLint, and Prettier configurations
│   └── validation/           # Shared Zod schemas (auth, contracts, royalties, stellar)
│
├── contracts/
│   └── royalty-agreement/    # Soroban smart contract in Rust (multi-party escrow & splits)
│
├── docs/
│   ├── architecture.md       # Architectural overview & module boundaries
│   ├── ai-architecture.md    # AI provider abstraction, agents, RAG & governance
│   ├── stellar-architecture.md # Stellar & Soroban on-chain architecture
│   ├── smart-contract-design.md# Soroban smart contract design, state machine & math
│   ├── deployment-guide.md   # Contract compilation, testnet deploy & operations
│   ├── stellar-api.md        # Stellar & Soroban REST API reference
│   ├── payment-infrastructure.md # Payment lifecycle, tokens, decimals & asset registry
│   ├── stellar-monitoring.md # Soroban event monitoring & cursor synchronization
│   ├── payment-reconciliation.md # Deterministic reconciliation & financial invariants
│   ├── royalty-intelligence.md # Historical earnings analysis & forward projections
│   ├── anomaly-detection.md  # Anomaly detection rules, AI explainability & review
│   ├── phase-4-testing.md    # Phase 4 testing suite & verification guide
│   ├── database-schema.md    # Relational schema, constraints, and indexes
│   ├── api-specification.md  # API v1 conventions and endpoint catalog
│   └── development-workflow.md# Developer setup and branch hygiene
│
├── .github/workflows/ci.yml  # GitHub Actions CI workflow
├── .env.example              # Environment variables template
├── package.json              # Monorepo root
├── pnpm-workspace.yaml       # Workspace package definitions
├── turbo.json                # Turborepo task pipeline
└── README.md
```

---

## 4. Getting Started

### Prerequisites

- Node.js >= 20.x
- pnpm >= 9.x / 10.x
- PostgreSQL 15+ (local or Docker)
- Redis 7+ (local or Docker)

### Installation

```bash
# 1. Clone repository
git clone <repository-url> fairtune
cd fairtune

# 2. Install workspace dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your local PostgreSQL credentials and secrets
```

---

## 5. Database Setup & Migrations

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run initial database migration
pnpm --filter @fairtune/api prisma:migrate:dev --name init
```

---

## 6. Development Commands

```bash
# Run all applications via Turborepo
pnpm dev

# Run only the NestJS backend
pnpm --filter @fairtune/api dev

# Run type check across all packages
pnpm typecheck

# Run linters
pnpm lint

# Format code
pnpm format

# Run automated test suites across monorepo
pnpm test

# Test Soroban smart contracts (Rust)
cargo test --manifest-path contracts/royalty-agreement/Cargo.toml

# Compile Soroban smart contracts to WASM
cargo build --manifest-path contracts/royalty-agreement/Cargo.toml --target wasm32-unknown-unknown --release
```

---

## 7. API Documentation

Once the backend is running, interactive Swagger documentation is available at:

```
http://localhost:4000/api/docs
```

API endpoints are versioned with the `/api/v1` prefix:

- **Authentication:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- **Users:** `GET /api/v1/users/me`, `PATCH /api/v1/users/me`
- **Documents (Ingestion & Extraction):** `POST /api/v1/documents`, `GET /api/v1/documents`, `GET /api/v1/documents/:id`, `GET /api/v1/documents/:id/status`, `GET /api/v1/documents/:id/text`, `POST /api/v1/documents/:id/retry`, `DELETE /api/v1/documents/:id`
- **Contract Analysis & Version Comparison:** `POST /api/v1/contract-analysis/:documentId`, `GET /api/v1/contract-analysis/:id`, `GET /api/v1/contract-analysis/document/:documentId`, `POST /api/v1/contract-analysis/compare`
- **Negotiation Copilot & SSE Streaming:** `POST /api/v1/negotiation/conversations`, `GET /api/v1/negotiation/conversations`, `GET /api/v1/negotiation/conversations/:id`, `POST /api/v1/negotiation/conversations/:id/messages`, `GET /api/v1/negotiation/conversations/:id/stream`, `POST /api/v1/negotiation/conversations/:id/stream`
- **AI Royalty Intelligence & Forecasting:** `POST /api/v1/royalty-intelligence/simulate`, `POST /api/v1/royalty-intelligence/simulate/save`, `GET /api/v1/royalty-intelligence/simulations`, `GET /api/v1/royalty-intelligence/simulations/:id`, `POST /api/v1/royalty-intelligence/forecast`, `GET /api/v1/royalty-intelligence/earnings/summary`, `GET /api/v1/royalty-intelligence/earnings/by-track`, `GET /api/v1/royalty-intelligence/earnings/by-collaborator`, `POST /api/v1/royalty-intelligence/anomalies/detect/:agreementId`, `GET /api/v1/royalty-intelligence/anomalies`, `GET /api/v1/royalty-intelligence/anomalies/detail/:id`, `POST /api/v1/royalty-intelligence/anomalies/:id/review`
- **Payments & Assets:** `POST /api/v1/payments/assets`, `GET /api/v1/payments/assets`, `GET /api/v1/payments/assets/:id`, `GET /api/v1/payments`, `GET /api/v1/payments/:id`, `GET /api/v1/payments/agreements/:agreementId`, `GET /api/v1/payments/collaborators/:collaboratorId`
- **Blockchain Monitoring:** `GET /api/v1/monitoring/status`, `POST /api/v1/monitoring/sync`
- **Payment Reconciliation:** `POST /api/v1/reconciliation/agreements/:agreementId`, `GET /api/v1/reconciliation/agreements/:agreementId`, `GET /api/v1/reconciliation/history`, `GET /api/v1/reconciliation/discrepancies`
- **Notifications:** `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`
- **Rights Intelligence:** `POST /api/v1/rights-intelligence/extract/:documentId`
- **Royalty Agreements:** `POST /api/v1/royalty-agreements`, `GET /api/v1/royalty-agreements`, `GET /api/v1/royalty-agreements/:id`
- **Stellar & Soroban Blockchain:** `GET /api/v1/stellar/network/status`, `GET /api/v1/stellar/accounts/:publicKey`, `POST /api/v1/stellar/accounts/friendbot`, `GET /api/v1/stellar/contracts/config`, `GET /api/v1/stellar/contracts/agreement/:agreementId`, `POST /api/v1/stellar/transactions/prepare-create-agreement`, `POST /api/v1/stellar/transactions/prepare-approve-agreement`, `POST /api/v1/stellar/transactions/prepare-deposit-escrow`, `POST /api/v1/stellar/transactions/prepare-distribute-royalties`, `POST /api/v1/stellar/transactions/prepare-cancel-agreement`, `POST /api/v1/stellar/transactions/simulate`, `POST /api/v1/stellar/transactions/submit`, `GET /api/v1/stellar/transactions/:hash`, `POST /api/v1/stellar/agreements/:agreementId/sync`
- **Health Check:** `GET /api/v1/health`

---

## 8. Security Guarantees

- **Non-Custodial:** The FairTune backend **never** requests, accepts, or stores private keys or secret seeds (`S...`). All transaction signing happens client-side under explicit artist control.
- **Refresh Token Rotation:** Refresh tokens are stored strictly as SHA-256 hashes. Token reuse immediately revokes all active sessions for the user.
- **Zero Secret Commits:** Pre-configured `.gitignore` and `.env.example` guard against secret leaks.

---

## 9. License

MIT

# fairtune
