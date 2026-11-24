# FairTune Database Schema Documentation

## 1. Design Philosophy

- **Engine:** PostgreSQL 16+
- **ORM:** Prisma ORM
- **Precision:** Financial allocations and cryptocurrency balances use exact Decimal representations (`Decimal(5, 2)` for percentages, `Decimal(18, 7)` for Stellar asset stroops) to eliminate floating-point arithmetic errors.
- **Security:** Passwords use Argon2id. Refresh tokens are hashed via SHA-256 before insertion. No private keys are stored.
- **AI-First Architecture:** Strongly typed relational models for conversations, messages, contract clauses, red flags, document embeddings, and usage telemetry.

## 2. Entity-Relationship Summary

```
                      ┌──────────────┐ 1      1 ┌───────────────┐
                      │     User     ├──────────┤ ArtistProfile │
                      └──┬───┬───┬───┘          └───────────────┘
                         │   │   │
        ┌────────────────┼───┼───┼────────────────────────┐
        │ 1              │ 1 │ 1 │ 1                      │ 1
        ▼ *              ▼ * │   ▼ *                      ▼ *
  ┌────────────┐ ┌───────────┤ ┌──────────────┐    ┌──────────────┐
  │ AIUsageLog │ │Conversation│ │ RefreshToken │    │   Document   │
  └────────────┘ └─────┬─────┘ └──────────────┘    └───┬───┬───┬──┘
                       │ 1                             │ 1 │ 1 │ 1
                       ▼ *                             │   │   │
                  ┌─────────┐                          │   │   │
                  │AIMessage│                          │   │   │
                  └───┬─────┘                          │   │   │
                      │ 1                              ▼ * │   ▼ *
                      ▼ *                     ┌────────────┴┐ ┌──────────────┐
             ┌──────────────────┐             │DocumentChunk│ │ContractClause│
             │AIMessageReference│             └──────┬──────┘ └──────────────┘
             └──────────────────┘                    │ 1
                                                     ▼ 1
                                            ┌─────────────────┐
                                            │DocumentEmbedding│
                                            └─────────────────┘
```

## 3. Entity Details

### 3.1 User & Identity

- `User`: Primary user account (email, Argon2 password hash, role).
- `ArtistProfile`: Public artist persona linked 1:1 with user.
- `RefreshToken`: Secure session tokens stored as SHA-256 hashes with reuse revocation.

### 3.2 Document & Contract Models

- `Document`: Uploaded PDF contract metadata, status, and UUID storage key.
- `DocumentChunk`: Text segmentation chunks with page references and token counts.
- `DocumentEmbedding`: Vector embedding coordinates (1536 dimensions) for semantic RAG search.
- `ContractAnalysis`: Executive summary, overall risk level, and structured JSON results.
- `ContractClause`: Individual extracted legal clauses with category, risk score, plain-English explanation, and recommended counter-clause language.
- `ContractFinding`: Specific categorized risks, predatory terms, or omissions.
- `ContractComparison`: Side-by-side diff between two contract versions.

### 3.3 AI Conversation & Grounding Models

- `AIConversation`: Chat session between an artist and FairTune's AI Negotiation Copilot, optionally linked to a specific contract document.
- `AIMessage`: Individual user or assistant messages with token usage and model metadata.
- `AIMessageReference`: Provenance citations linking assistant claims directly to specific `DocumentChunk` and `ContractClause` IDs with relevance scores.
- `AIUsageLog`: Comprehensive audit log recording user, task type, provider, model, prompt/completion tokens, estimated USD cost, and latency.

### 3.4 Royalty Agreements & Stellar Blockchain

- `RoyaltyAgreement`: Smart split agreements defining track name, status, and 100% total allocation.
- `Collaborator`: Collaborator profiles with verified Stellar public addresses (`G...`).
- `AgreementParticipant`: Join table mapping collaborators to agreements with individual `Decimal(5, 2)` shares and approval state.
- `Transaction`: On-chain Stellar payment transaction hashes, asset codes, and amounts.
