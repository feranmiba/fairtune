# FairTune Deployment & Operations Guide

## 1. Prerequisites & Toolchain Setup

### 1.1 Rust & WebAssembly Target

Ensure the Rust toolchain with the `wasm32-unknown-unknown` target is installed:

```bash
# Verify Rust installation (Rust 1.80+ recommended)
rustc --version
cargo --version

# Add wasm32-unknown-unknown target
rustup target add wasm32-unknown-unknown
```

### 1.2 Dependency Pinning Note

> [!IMPORTANT]
> The contract pins `ed25519-dalek = "=2.1.1"` in `Cargo.lock` to ensure binary compatibility with `soroban-env-host v22.1.3` and prevent breaking changes introduced in `ed25519-dalek v3.0`.

### 1.3 Stellar CLI

Install the official Stellar CLI:

```bash
# macOS via Homebrew
brew install stellar-cli

# Verify version
stellar --version
```

---

## 2. Compiling and Testing the Smart Contract

### 2.1 Run Unit & Invariant Tests

Execute all Rust unit tests:

```bash
cargo test --manifest-path contracts/royalty-agreement/Cargo.toml
```

Expected output:

```
test test::test_successful_agreement_creation_and_lifecycle ... ok
test test::test_rejects_invalid_basis_points_total - should panic ... ok
test test::test_rejects_duplicate_participants - should panic ... ok
test test::test_rejects_deposit_before_activation - should panic ... ok
test test::test_escrow_deposit_and_deterministic_distribution ... ok
test test::test_distribution_remainder_handling_zero_leak ... ok
test test::test_cancellation_rules ... ok

test result: ok. 7 passed; 0 failed; 0 ignored; 0 measured
```

### 2.2 Compile Optimized Release WASM

```bash
cargo build \
  --manifest-path contracts/royalty-agreement/Cargo.toml \
  --target wasm32-unknown-unknown \
  --release
```

The compiled output is located at:
`contracts/royalty-agreement/target/wasm32-unknown-unknown/release/fairtune_royalty_agreement.wasm` (approximately 25 KB).

---

## 3. Stellar Testnet Deployment

### 3.1 Configure Network and Identities

Configure Stellar Testnet in the Stellar CLI:

```bash
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Generate or import deployer identity
stellar keys generate --global fairtune-deployer --network testnet

# Fund deployer identity via Friendbot
stellar keys fund fairtune-deployer --network testnet
```

### 3.2 Install and Deploy Contract

```bash
# 1. Install contract WASM to ledger and get WASM hash
WASM_HASH=$(stellar contract install \
  --wasm contracts/royalty-agreement/target/wasm32-unknown-unknown/release/fairtune_royalty_agreement.wasm \
  --source fairtune-deployer \
  --network testnet)

echo "WASM Hash: $WASM_HASH"

# 2. Deploy contract instance
CONTRACT_ID=$(stellar contract deploy \
  --wasm-hash $WASM_HASH \
  --source fairtune-deployer \
  --network testnet)

echo "Contract ID: $CONTRACT_ID"
```

### 3.3 Deploy or Reference Payment Token (SAC)

For royalty payouts in USDC or native XLM, deploy or reference the Stellar Asset Contract:

```bash
# For native XLM:
stellar contract id asset --asset native --network testnet
# Returns native XLM SAC contract address (e.g., CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC)
```

---

## 4. Backend Configuration & Migration

### 4.1 Update Environment Variables

In `apps/api/.env`:

```env
# Stellar Testnet Configuration
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL="https://horizon-testnet.stellar.org"
STELLAR_SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Deployed Contract ID
STELLAR_CONTRACT_ID="C..."
STELLAR_PLATFORM_PUBLIC_KEY="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
```

### 4.2 Apply Database Migration

Apply the Phase 3 schema migration (`20261121080000_phase3_onchain_sync`):

```bash
# Run migration
pnpm --filter @fairtune/api exec prisma migrate deploy

# Generate Prisma Client
pnpm --filter @fairtune/api exec prisma generate
```

---

## 5. Verification & Monitoring

### 5.1 Backend Health & RPC Connectivity

Test that the backend correctly connects to Horizon and Soroban RPC:

```bash
curl -X GET http://localhost:4000/api/v1/stellar/network/status \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Response:

```json
{
  "connected": true,
  "horizonVersion": "2.30.0",
  "rpcHealthy": true,
  "network": "TESTNET",
  "contractConfigured": true
}
```

### 5.2 Contract Read Verification

Check contract agreement status directly through backend:

```bash
curl -X GET http://localhost:4000/api/v1/stellar/contracts/agreement/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
