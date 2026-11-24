# FairTune Development Workflow

## 1. Prerequisites

- Node.js >= 20.x
- pnpm >= 9.x / 10.x
- Docker or local PostgreSQL and Redis instances

## 2. Initial Setup

1. **Clone the repository:**

   ```bash
   git clone <repo-url> fairtune
   cd fairtune
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**

   ```bash
   cp .env.example .env
   # Update DATABASE_URL and secrets in .env as needed
   ```

4. **Initialize Database:**
   ```bash
   pnpm --filter @fairtune/api prisma:generate
   pnpm --filter @fairtune/api prisma:migrate:dev
   ```

## 3. Development Commands

```bash
# Start all apps and services via Turborepo
pnpm dev

# Run NestJS API independently
pnpm --filter @fairtune/api dev

# Run type checking across the entire monorepo
pnpm typecheck

# Run linters
pnpm lint

# Format codebase
pnpm format

# Run all test suites
pnpm test
```

## 4. Coding Standards

- **TypeScript Strictness:** Strict mode is enforced. Avoid `any`; use proper generics, interfaces, or `unknown` with runtime type narrowing.
- **Shared Validation:** DTOs and API payloads must be declared as Zod schemas inside `packages/validation` before being consumed in NestJS controllers.
- **Stellar Security:** Never pass or log private keys or secret seeds (`S...`). All transactions are constructed as unsigned XDR envelopes for client-side signing.
