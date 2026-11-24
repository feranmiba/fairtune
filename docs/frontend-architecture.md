# FairTune Frontend Architecture & Design Specification (Phase 5)

## 1. Executive Summary

The FairTune frontend (`apps/web`) is a professional, high-performance web application tailored to independent musicians, songwriters, and producers. It couples AI-driven contract intelligence with transparent, non-custodial Stellar Soroban royalty management.

In accordance with project design rules (`frontend-design`, `avoid-ai-writing`, and `audit-ai-design-slop`), the UI avoids generic SaaS tropes (no neon gradient spam, no card-within-card stacking, no fake vanity metrics). It communicates three core premises:

> **Understand what you're signing. Know what you own. Get what you're owed.**

---

## 2. Technology Stack & Monorepo Tooling

| Layer                    | Technology                                                                               |
| :----------------------- | :--------------------------------------------------------------------------------------- |
| **Framework**            | React 18 + Vite 5 + TypeScript (Strict Mode)                                             |
| **Styling**              | Tailwind CSS v3 with semantic design tokens                                              |
| **Routing**              | React Router DOM v6 with nested authenticated shells and route guards                    |
| **Icons**                | Lucide React                                                                             |
| **Shared Packages**      | `@fairtune/shared` (DTOs, enums, stroop constants), `@fairtune/validation` (Zod schemas) |
| **Blockchain Extension** | Freighter Wallet API (client-side transaction signing)                                   |
| **API Client**           | Centralized typed HTTP client with JWT auto-injection and silent refresh                 |

---

## 3. Design System & Tokens (`frontend-design`)

### Color Palette

- **Canvas:** `#0D0F12` (deep charcoal obsidian)
- **Surface:** `#14181F` (slate container)
- **Surface Elevated:** `#1C222B` (elevated cards and dialogs)
- **Borders:** `#262E3B` (subtle structural divider)
- **Brand Gold:** `#E5C158` (royalties, earnings, primary actions)
- **Brand Stellar:** `#00E5FF` (Stellar network verification, blockchain records)
- **Semantic Statuses:** Emerald (`#10B981`), Amber (`#F59E0B`), Rose (`#EF4444`)

### Typography

- **Headings & Body:** Plus Jakarta Sans / Inter
- **Financial & On-Chain Hashes:** JetBrains Mono (XLM/USDC amounts, stroops, Ed25519 public keys, transaction hashes)

### Reusable UI Primitives

- `Button`: Primary, Stellar, Secondary, Ghost, Danger variants with loading spinners.
- `Input`: Semantic label, helper text, error feedback, prefix/suffix icons.
- `Card`, `CardHeader`, `CardTitle`: Clean structural grouping without gratuitous card nesting.
- `Badge`: Status and network tags with controlled contrast.
- `Table`, `TableHeader`, `TableRow`, `TableCell`: Accessible tabular representation for transactions and contracts.
- `Dialog`: Accessible modal dialog with backdrop blur, keyboard `Escape` closing, and focus preservation.
- `Alert`: Contextual inline notifications.
- `EmptyState`: Directional invitations to act without corporate fluff.

---

## 4. Application Feature Map & Pages

```
/ (LandingPage)
├── /login (LoginPage)
├── /register (RegisterPage)
├── /onboarding (ArtistOnboardingPage)
└── AppLayout (Protected Shell)
    ├── /dashboard (DashboardPage)
    ├── /contracts (ContractListPage & Upload)
    ├── /contracts/:id (ContractDetailPage with Clause Breakdown & Risk Flags)
    ├── /contracts/chat (ContractChatPage - AI Assistant with Contract Excerpts)
    ├── /agreements (AgreementListPage)
    ├── /agreements/create (AgreementCreatePage with 10,000 bps Split Validation)
    ├── /agreements/:id (AgreementDetailPage with Freighter Approvals & Escrow)
    ├── /payments (PaymentHistoryPage with Stellar Expert Explorer Links)
    ├── /intelligence (RoyaltyAnalyticsPage, Split Simulator & Forecasting)
    ├── /anomalies (AnomalyListPage with Objective AI Review Workflow)
    ├── /wallet (WalletSettingsPage with Live Balances & Transaction Log)
    └── /profile (ArtistProfilePage)
```

---

## 5. Non-Custodial Security & Integrity Guarantees

1. **Zero Private Key Exposure:**
   - The application **never asks for, handles, or stores private keys or recovery phrases**.
   - All blockchain transactions are built on the backend as unsigned Base64 XDR envelopes, signed client-side in the user's browser via the Freighter extension, and broadcast to Stellar.
2. **Truth in Data:**
   - On-chain confirmed earnings, pending transactions, and forward forecasts are visually isolated.
   - Forward forecasting explicitly carries confidence scores and mathematical disclaimers; no fabricated revenue charts.
3. **Deterministic Arithmetic:**
   - Allocation totals enforce the Soroban 10,000 basis points rule (100.00%) before agreement submission is permitted.
