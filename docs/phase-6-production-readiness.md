# FairTune — Phase 6: Production Readiness & Verification Guide

## 1. Overview

Phase 6 validates the end-to-end integration, reliability, security, and financial correctness of FairTune across all seven core user workflows (Workflows A–G).

---

## 2. Verified End-to-End Workflows

### Workflow A: Authentication and Artist Onboarding
- **Registration & Login:** Validated with email/password authentication, returning signed JWT access/refresh tokens.
- **Onboarding Flow:** Allows new artists to configure their artist profile and link their Stellar Ed25519 public key.
- **Session Security:** Token expiration and invalidation tested with automatic redirection on unauthorized requests.

### Workflow B: Contract Intelligence
- **Document Upload:** Validates file size (max 25MB) and mime-types (PDF, DOCX).
- **Text & Clause Extraction:** Breaks uploaded legal agreements into numbered pages and clause categories (Rights Grant, Exclusivity, Streaming Splits, Recoupment).
- **RAG Semantic Grounding:** Contract chunks are embedded and indexed for contextual search during analysis.

### Workflow C: Negotiation Copilot
- **Thread Management:** Conversations are isolated per user and contract document.
- **Cited Excerpts:** AI responses extract and cite specific page numbers and clauses from the uploaded contract.
- **Legal Safeguards:** UI banner warns artists that FairTune provides analytical assistance, not formal legal advice.

### Workflow D: Royalty Agreement Lifecycle
- **Creation & Allocation:** Validates that participant shares sum to exactly $100.00\%$ ($10,000$ basis points).
- **Multi-Party Consensus:** In-app and on-chain signing tracks collaborator approval threshold.
- **Status Progression:** `DRAFT` $\rightarrow$ `PENDING_APPROVAL` $\rightarrow$ `ACTIVE` $\rightarrow$ `TERMINATED`.

### Workflow E: Royalty Deposits & Escrow Distributions
- **Dual Accounting:** Supports both simulated/in-app deposits and live Soroban on-chain settlement.
- **Integer Precision:** Token amounts are converted into raw subunits (stroops) using asset decimals.
- **Zero Leakage:** Integer division remainders are credited to the agreement creator to prevent stranded funds.
- **Confirmed Records:** Payouts are marked `CONFIRMED` only upon verified ledger execution.

### Workflow F: Royalty Intelligence & Analytics
- **Historical vs. Forward Projection:** Clearly separates confirmed on-chain historical earnings from forward forecasting models.
- **Anomaly Detection:** Flags sudden revenue drops, below-split payments, and cross-collateralization risks.
- **Decimal Safety:** All frontend monetary displays use defensive `Number(...)` parsing to eliminate runtime formatting errors.

### Workflow G: Frontend Reliability
- **Global Error Boundary:** Catches and isolates unhandled rendering errors without crashing the main application.
- **Design System Consistency:** Built with Tailwind tokens, Radix UI primitives, and clear state badges (Active, Pending, Confirmed).

---

## 3. Production Deployment Checklist

### 3.1 Environment Configuration
Ensure the following environment variables are configured in production:

```bash
# Node & Application
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://fairtune.app

# Database & Cache
DATABASE_URL=postgresql://user:password@postgres-host:5432/fairtune?schema=public
REDIS_HOST=redis-host
REDIS_PORT=6379

# Authentication
JWT_ACCESS_SECRET=your_secure_32_character_access_secret
JWT_REFRESH_SECRET=your_secure_32_character_refresh_secret

# Stellar & Soroban
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
STELLAR_ROYALTY_CONTRACT_ID=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM

# AI Provider (Optional / Live)
OPENAI_API_KEY=sk-...
```

### 3.2 Pre-Deployment Verification Commands
Run before promoting any build to staging or production:

```bash
# 1. Typecheck all monorepo packages
pnpm typecheck

# 2. Run full automated test suite (Jest)
pnpm test

# 3. Run Soroban smart contract cargo tests
cargo test --manifest-path contracts/royalty-agreement/Cargo.toml

# 4. Build production bundles
pnpm build
```

---

## 4. Runbook: Starting Production Services

```bash
# Apply database migrations
pnpm prisma:migrate:deploy

# Start API server
node apps/api/dist/main.js

# Serve Web assets (or deploy dist/ to CDN/Cloudflare/Vercel)
# apps/web/dist/
```
