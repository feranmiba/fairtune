# FairTune Stellar & Soroban API Specification

Base URL: `/api/v1/stellar`  
All endpoints require JWT Bearer Authentication (`Authorization: Bearer <token>`) unless noted otherwise.

---

## 1. Network & Accounts

### 1.1 Check Network Status

Check Horizon and Soroban RPC connectivity and active network parameters.

- **Method:** `GET /network/status`
- **Auth:** Optional
- **Response `200 OK`:**

```json
{
  "connected": true,
  "horizonVersion": "2.30.0",
  "rpcHealthy": true,
  "network": "TESTNET",
  "contractConfigured": true
}
```

### 1.2 Get Account Info

Retrieve balance and sequence info for a Stellar public key.

- **Method:** `GET /accounts/:publicKey`
- **Path Params:** `publicKey` (String, valid G... address)
- **Response `200 OK`:**

```json
{
  "accountId": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "sequence": "12345678901234",
  "balances": [
    {
      "asset_type": "native",
      "balance": "100.0000000"
    }
  ]
}
```

### 1.3 Fund Account (Friendbot)

Fund a testnet account using Stellar Friendbot. Only available on Testnet.

- **Method:** `POST /accounts/friendbot`
- **Request Body:**

```json
{
  "publicKey": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
}
```

- **Response `200 OK`:**

```json
{
  "success": true,
  "message": "Account funded successfully via Friendbot"
}
```

---

## 2. Soroban Contract Inspection

### 2.1 Get Contract Configuration

- **Method:** `GET /contracts/config`
- **Response `200 OK`:**

```json
{
  "contractId": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
  "rpcUrl": "https://soroban-testnet.stellar.org"
}
```

### 2.2 Read On-Chain Agreement

Fetch the live on-chain state for a given numeric agreement ID.

- **Method:** `GET /contracts/agreement/:agreementId`
- **Path Params:** `agreementId` (Number | String)
- **Response `200 OK`:**

```json
{
  "id": "1",
  "creator": "GCREATOR47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
  "trackId": "ISRC-US-A12-24-00001",
  "metadataHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "token": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  "participants": [
    {
      "address": "GARTIST17IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
      "basisPoints": 6000
    },
    {
      "address": "GPRODUCER7IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
      "basisPoints": 4000
    }
  ],
  "approvals": [
    "GARTIST17IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
    "GPRODUCER7IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL"
  ],
  "status": "ACTIVE",
  "totalDeposited": "1000000000",
  "totalDistributed": "0",
  "createdAt": 1700000000
}
```

---

## 3. Non-Custodial Transaction Preparation

All transaction preparation endpoints return an unsigned Base64-encoded Stellar transaction XDR (`unsignedXdr`), resource fee breakdown, and transaction simulation results. The user signs this XDR in their local wallet (Freighter).

### 3.1 Prepare Agreement Creation Transaction

- **Method:** `POST /transactions/prepare-create-agreement`
- **Request Body:**

```json
{
  "agreementId": "cm-agreement-uuid",
  "sourcePublicKey": "GCREATOR47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
  "trackId": "ISRC-US-A12-24-00001",
  "metadataHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "tokenAddress": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  "participants": [
    {
      "address": "GARTIST17IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
      "basisPoints": 6000
    },
    {
      "address": "GPRODUCER7IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
      "basisPoints": 4000
    }
  ]
}
```

- **Response `200 OK`:**

```json
{
  "unsignedXdr": "AAAAAgAAAAD...",
  "fee": "100000",
  "simulation": {
    "success": true,
    "fee": "100000",
    "returnValue": 1
  }
}
```

### 3.2 Prepare Collaborator Approval Transaction

- **Method:** `POST /transactions/prepare-approve-agreement`
- **Request Body:**

```json
{
  "onChainAgreementId": 1,
  "collaboratorPublicKey": "GARTIST17IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL"
}
```

- **Response `200 OK`:** Returns `unsignedXdr` for collaborator approval.

### 3.3 Prepare Escrow Deposit Transaction

- **Method:** `POST /transactions/prepare-deposit-escrow`
- **Request Body:**

```json
{
  "onChainAgreementId": 1,
  "payerPublicKey": "GDSP47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL",
  "amountStroops": "1000000000"
}
```

- **Response `200 OK`:** Returns `unsignedXdr` invoking SAC token transfer into contract escrow.

### 3.4 Prepare Distribute Royalties Transaction

- **Method:** `POST /transactions/prepare-distribute-royalties`
- **Request Body:**

```json
{
  "onChainAgreementId": 1,
  "callerPublicKey": "GCREATOR47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL"
}
```

- **Response `200 OK`:** Returns `unsignedXdr` for atomic distribution.

---

## 4. Simulation, Submission & Synchronization

### 4.1 Simulate Transaction

- **Method:** `POST /transactions/simulate`
- **Request Body:**

```json
{
  "transactionXdr": "AAAAAgAAAAD..."
}
```

- **Response `200 OK`:**

```json
{
  "success": true,
  "fee": "15000",
  "events": [],
  "returnValue": true
}
```

### 4.2 Submit Signed Transaction

Submits a client-signed XDR envelope to Soroban RPC, polls until confirmed, and registers audit logs.

- **Method:** `POST /transactions/submit`
- **Request Body:**

```json
{
  "signedXdr": "AAAAAgAAAAD...",
  "transactionType": "AGREEMENT_CREATION",
  "agreementId": "cm-agreement-uuid",
  "onChainAgreementId": 1
}
```

- **Response `200 OK`:**

```json
{
  "status": "SUCCESS",
  "hash": "7b8e1f0e4b868e...",
  "ledger": 1058292,
  "createdAt": "2026-11-21T09:00:00.000Z"
}
```

### 4.3 Sync Agreement from Chain

Fetches the authoritative state from Soroban RPC and updates PostgreSQL models (`RoyaltyAgreement`, `AgreementParticipant`).

- **Method:** `POST /agreements/:agreementId/sync`
- **Path Params:** `agreementId` (UUID string)
- **Response `200 OK`:**

```json
{
  "id": "cm-agreement-uuid",
  "onChainAgreementId": 1,
  "onChainStatus": "ACTIVE",
  "lastSyncedLedger": 1058292,
  "lastSyncedAt": "2026-11-21T09:00:00.000Z",
  "participants": [
    {
      "id": "part-uuid-1",
      "walletAddress": "GARTIST...",
      "onChainApproved": true
    }
  ]
}
```
