# FairTune AI Architecture & Governance

## 1. Architectural Philosophy

FairTune is an **AI-First Music Rights Intelligence Platform**. Rather than treating AI as an isolated add-on for simple text summarization, AI is integrated into the core architecture across four dedicated intelligence streams:

1. **Contract Analysis Intelligence:** Deep extraction, clause categorization, and risk scoring.
2. **Contract Negotiation Copilot:** Interactive, document-grounded dialogue providing counter-clause phrasing and strategic questions.
3. **Royalty Intelligence:** Mathematical simulation, recoupment waterfall modeling, and on-chain payout anomaly detection.
4. **Music Rights Intelligence:** Ownership parsing, contributor attribution, and inter-document inconsistency flagging.

---

## 2. Component Topology

```
 apps/api/src/modules/ai/
 ├── providers/
 │   ├── interfaces/ai-provider.interface.ts   # Core IAiProvider contract
 │   ├── adapters/development-ai.adapter.ts    # Deterministic development adapter
 │   └── provider.factory.ts                  # Provider resolution & fallback
 ├── agents/
 │   ├── base/agent.interface.ts               # Controlled agent interface
 │   ├── contract-agent/                       # ContractAnalysisAgent
 │   ├── negotiation-agent/                    # NegotiationAgent
 │   ├── royalty-agent/                        # RoyaltyIntelligenceAgent
 │   └── rights-agent/                         # RightsIntelligenceAgent
 ├── tools/
 │   ├── interfaces/tool.interface.ts          # IAgentTool with Zod schemas
 │   ├── implementations/                      # Royalty calculator, text retriever, comparison
 │   └── tool.registry.ts                     # Explicit tool registration
 ├── prompts/
 │   ├── system-guardrails.ts                  # Prompt injection & legal disclaimer guards
 │   ├── contract-analysis.prompt.ts
 │   ├── negotiation.prompt.ts
 │   ├── royalty-intelligence.prompt.ts
 │   └── rights-intelligence.prompt.ts
 ├── memory/
 │   └── conversation-memory.service.ts        # Short-term chat history & token limits
 ├── embeddings/
 │   ├── embedding.interface.ts
 │   └── embedding.service.ts                  # Chunking, vector embeddings & cosine search
 └── usage/
     └── ai-usage.service.ts                   # Token consumption & cost tracking
```

---

## 3. Provider Abstraction (`IAiProvider`)

Business logic in FairTune never directly imports external vendor SDKs (e.g. OpenAI or Anthropic). Instead, it interacts exclusively with `IAiProvider`:

- **Structured Output:** Guaranteed schema conformance via Zod schema parsing.
- **Streaming:** Native `Readable` stream support for conversational interfaces.
- **Embeddings:** Unified vector generation (1536 dimensions default).
- **Tool Calling:** Declarative parameter schemas for agent tool invocation.
- **Token Usage Estimation:** Automated prompt and completion token tracking with cost modeling.
- **Timeout & Retries:** Configurable request deadlines and resilient backoff.

In Phase 1, `DevelopmentAiAdapter` provides a self-contained, deterministic implementation that enables local unit testing, schema verification, and end-to-end flows without incurring live cloud costs or requiring active API keys.

---

## 4. Controlled Agent Architecture

FairTune implements a **Least-Privilege Agent Pattern**:

| Agent                          | Responsibility                                                             | Allowed Tools                                        | Forbidden Actions                                                      |
| ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| **Contract Analysis Agent**    | Extract clauses, classify risks, identify red flags                        | `retrieve_contract_text`, `compare_contract_clauses` | Modifying documents, executing database writes outside analysis tables |
| **Negotiation Copilot Agent**  | Clarify legal language, draft counter-clauses, cite source clauses         | `retrieve_contract_text`, `compare_contract_clauses` | Offering legal advice, signing contracts, altering agreement records   |
| **Royalty Intelligence Agent** | Simulate splits, model recoupment waterfalls, inspect payout discrepancies | `calculate_royalty_distribution`                     | Modifying Stellar balances, approving agreements, executing payments   |
| **Rights Intelligence Agent**  | Extract contributor metadata, flag missing shares                          | `retrieve_contract_text`                             | Certifying legal copyright title, altering collaborator records        |

### Core Agent Invariants:

1. **Zero Autonomous Financial Authority:** Agents **cannot** initiate Stellar payments, sign transactions, or alter participant splits.
2. **Explicit Tool Registration:** Agents can only invoke tools explicitly registered in `ToolRegistry`.
3. **No Direct Database Writes:** Agents return structured outputs to domain services, which enforce ownership checks before writing to PostgreSQL.

---

## 5. RAG Pipeline (Retrieval-Augmented Generation)

To ensure answers are grounded and prevent hallucination of non-existent contract terms:

1. **Extraction & Chunking:** `EmbeddingService.chunkDocument()` partitions PDF text into overlapping semantic segments (1000 characters with 150-character overlap), respecting paragraph and sentence boundaries.
2. **Vector Persistence:** `DocumentEmbedding` records store normalized vectors linked 1:1 with `DocumentChunk`.
3. **Tenant & Document Isolation:** Semantic searches are hard-filtered by `documentId` and verified against the requesting `userId`. No cross-user context leakage is possible.
4. **Citation Provenance:** Grounded responses generate `AIMessageReference` records linking assistant claims to specific chunk IDs, page numbers, and source excerpts.

---

## 6. Prompt Injection Resistance & Security Governance

FairTune treats all uploaded documents as **untrusted passive data**, never as active system instructions.

### Security Defenses:

- **Separation of Instructions and Data:** System prompts enclose document excerpts within explicit XML/delimiter boundaries (`"""`) and instruct the LLM to ignore any imperative commands embedded within the contract text.
- **Legal Non-Advice Boundary:** All conversational outputs enforce standard disclaimers, clarifying that FairTune provides educational contract intelligence, not certified legal counsel.
- **Provenance Distinction:** The UI and API clearly separate:
  - _Actual Contract Text_ (verbatim extracted clauses)
  - _Contextual Explanation_ (analytical summary)
  - _AI Suggestion_ (proposed negotiation language)

---

## 7. AI Observability & Cost Management (`AIUsageLog`)

Every AI invocation records structured telemetry:

- `userId`: Requesting artist/collaborator
- `taskType`: Task category (`CONTRACT_ANALYSIS`, `NEGOTIATION`, `ROYALTY_SIMULATION`, etc.)
- `provider`: Provider identifier
- `model`: Model name
- `promptTokens` / `completionTokens` / `totalTokens`
- `estimatedCostUsd`: Calculated based on model pricing
- `durationMs`: Latency tracking
- `status`: `SUCCESS` or `FAILED`
