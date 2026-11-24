# FairTune Architecture Overview

## 1. System Vision

FairTune is an **AI-First Music Rights Intelligence and Blockchain Royalty Protection Platform** built for the Stellar hackathon. It empowers independent artists, songwriters, producers, and collaborators by:

1. **Decoding complex legal contracts** into plain language, highlighting predatory or high-risk clauses (unfavorable copyright assignments, perpetual rights, unfair audit costs, hidden recoupment).
2. **Interactive Contract Negotiation Copilot** allowing artists to ask grounded questions about contracts, evaluate counter-proposals, and craft negotiation terms.
3. **Deterministic Royalty Intelligence & Anomaly Detection** enabling split simulation before agreements and detecting discrepancy patterns on-chain.
4. **Music Rights Intelligence** extracting contributor metadata and cross-document inconsistencies.
5. **Managing transparent royalty splits** through collaborative digital agreements, cryptographically anchored to Stellar Soroban smart contracts and executed via Stellar transactions.

```
                      ┌───────────────────────────────────────────────┐
                      │              FairTune Web (UI)                │
                      │  - Contract Upload & Risk Heatmap             │
                      │  - AI Negotiation Copilot Chat Interface      │
                      │  - Royalty Split Simulator & Agreements       │
                      │  - Non-Custodial Stellar Signing (Freighter)  │
                      └──────────────────────┬────────────────────────┘
                                             │ HTTPS / REST / JWT
                                             ▼
                      ┌───────────────────────────────────────────────┐
                      │             NestJS Backend (apps/api)         │
                      │                                               │
                      │   ┌───────────┐ ┌──────────────┐ ┌────────┐  │
                      │   │ Auth & RBAC│ │ Documents    │ │Agreements│ │
                      │   └─────┬─────┘ └──────┬───────┘ └───┬────┘  │
                      │         │              │             │        │
                      │   ┌─────▼──────────────▼─────────────▼────┐  │
                      │   │     Centralized AI Intelligence       │  │
                      │   │  - Contract Analysis Agent            │  │
                      │   │  - Negotiation Copilot Agent          │  │
                      │   │  - Royalty Intelligence Agent         │  │
                      │   │  - Rights Intelligence Agent          │  │
                      │   │  - RAG & Vector Embeddings            │  │
                      │   └────────────────────┬──────────────────┘  │
                      │                        │                     │
                      │   ┌────────────────────▼──────────────────┐  │
                      │   │     BullMQ Asynchronous Queues         │  │
                      │   └─────────────┬─────────────────────────┘  │
                      └─────────────────┼─────────────────────────────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
      ┌─────────────────────┐ ┌────────────────────┐ ┌───────────────────┐
      │  AI Provider        │ │ PostgreSQL + Prisma│ │ Stellar & Soroban │
      │  (IAiProvider)      │ │ (Relational + RAG) │ │ (Testnet/Horizon) │
      └─────────────────────┘ └────────────────────┘ └───────────────────┘
```

## 2. Core Monorepo Packages

- **`apps/api`**: NestJS modular application handling authentication, document lifecycle, agreement workflows, Stellar verification, and BullMQ worker scheduling.
- **`apps/web`**: Reserved for the future frontend application (Phase 2).
- **`packages/shared`**: Universal domain types, enums, constants, and utilities consumed across both API and Web.
- **`packages/validation`**: Single source of truth for runtime validation using Zod.
- **`packages/config`**: Reusable configurations for TypeScript, ESLint, and Prettier.

## 3. Backend Module Boundaries

### 3.1 Authentication & User Management (`modules/auth`, `modules/users`)

- Password hashing using Argon2id with high-entropy salt.
- Dual-token model: short-lived JWT access tokens (15m) and secure refresh tokens (7d).
- Refresh tokens are stored strictly as cryptographically hashed tokens (`SHA-256`) in PostgreSQL. When refreshed, rotation invalidates the old token; token family reuse triggers immediate revocation of all user sessions.

### 3.2 Document Storage (`modules/documents`)

- Decoupled from cloud providers via the `StorageService` interface.
- Local development storage adapter (`LocalStorageAdapter`) with directory traversal checks, MIME type verification (`application/pdf`), and magic byte headers (`%PDF-`).
- Ready for seamless migration to `S3StorageAdapter` or Google Cloud Storage in production.

### 3.3 Centralized AI Module (`modules/ai`)

- **Provider Abstraction (`IAiProvider`):** Decoupled vendor abstraction supporting structured outputs, tool-calling, streaming, and embeddings.
- **Specialized Agents:**
  - `ContractAnalysisAgent`: Deep analysis, clause classification, and risk evaluation.
  - `NegotiationAgent`: Interactive grounded conversation with source-clause citations.
  - `RoyaltyIntelligenceAgent`: Decimal-safe split simulations and waterfall modeling.
  - `RightsIntelligenceAgent`: Music ownership metadata extraction and gap analysis.
- **RAG & Vector Retrieval:** Document chunking, vector generation, and user-isolated similarity search.
- **Observability:** Centralized `AiUsageService` logging tokens, durations, and costs into `AIUsageLog`.

### 3.4 Feature Intelligence Modules

- **`modules/contract-analysis`:** Orchestrates contract parsing, stores strongly typed `ContractClause` and `ContractFinding` rows, and indexes chunks for RAG.
- **`modules/negotiation`:** Manages conversations, messages, and document-grounded answers.
- **`modules/royalty-intelligence`:** Provides decimal-accurate simulation and agreement anomaly checks.
- **`modules/rights-intelligence`:** Ingests contracts and surfaces structured contributor credits.

### 3.5 Stellar Blockchain Integration (`modules/stellar`)

- Non-custodial architectural guarantee: the backend **never** stores private keys or secret seeds. Transaction signing remains under explicit artist control (Freighter/Albedo).
- Modular Stellar services:
  - `StellarNetworkService`: Horizon and Soroban RPC Testnet configuration and ledger connectivity checks.
  - `StellarAccountService`: Public key validation (`StrKey.isValidEd25519PublicKey`) and account funding verification.
  - `StellarTransactionService`: Unsigned transaction building and on-chain transaction hash verification.
  - `SorobanContractService`: Soroban Royalty smart contract address validation and configuration.

### 3.6 Royalty Agreements (`modules/royalty-agreements`, `modules/collaborators`)

- Enforces decimal-accurate percentage splits (exactly 100.00% total allocation) using `Prisma.Decimal`.
- Multi-party approval state machine: Agreements move from `DRAFT` to `PENDING_APPROVAL` to `ACTIVE` only after all designated collaborators record approval.

## 4. Security & Governance Principles

1. **Zero Secret Leakage:** Passwords, tokens, AI keys, and blockchain secrets are excluded from logs and Swagger responses.
2. **Prompt Injection Resistance:** Uploaded contracts are treated as untrusted data, never as system instructions.
3. **Non-Custodial Separation:** AI agents have zero access to blockchain signing keys or wallet credentials.
4. **Strict Document Isolation:** RAG searches and document lookups are hard-isolated by authenticated user ID.
