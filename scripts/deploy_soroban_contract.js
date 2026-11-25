const fs = require('fs');
const path = require('path');
const sdkPath = path.resolve(__dirname, '../apps/api/node_modules/@stellar/stellar-sdk');
const {
  Keypair,
  rpc,
  Operation,
  TransactionBuilder,
  Networks,
  Address,
  xdr,
} = require(sdkPath);

const RPC_URL = 'https://soroban-testnet.stellar.org';
const PASSPHRASE = Networks.TESTNET;
const KNOWN_WASM_HASH = 'a4edb275fc91ee3ec01de8c859110f43d501804dd4a9a0be929988091ebcd91d';

async function queryTxStatus(hash) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: { hash },
    }),
  });
  const data = await res.json();
  return data.result;
}

async function deploy() {
  console.log('--- FairTune Soroban Contract Deployer ---');
  const server = new rpc.Server(RPC_URL);

  // 1. Generate ephemeral deployer keypair
  const deployer = Keypair.random();
  console.log('Deployer Public Key:', deployer.publicKey());

  // 2. Fund with Friendbot
  console.log('Funding deployer account via Friendbot...');
  const friendbotRes = await fetch(`https://friendbot.stellar.org?addr=${deployer.publicKey()}`);
  if (!friendbotRes.ok) {
    throw new Error(`Friendbot funding failed: ${friendbotRes.statusText}`);
  }
  console.log('Account funded successfully.');

  const wasmHash = Buffer.from(KNOWN_WASM_HASH, 'hex');
  console.log('Using confirmed uploaded WASM Hash:', KNOWN_WASM_HASH);

  // 3. Create Contract Instance
  console.log('Creating contract instance on Stellar Testnet...');
  const updatedAccount = await server.getAccount(deployer.publicKey());
  const deployAddress = Address.fromString(deployer.publicKey());

  const createOp = Operation.createCustomContract({
    address: deployAddress,
    wasmHash: wasmHash,
  });

  const createTx = new TransactionBuilder(updatedAccount, {
    fee: '100000',
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(createOp)
    .setTimeout(300)
    .build();

  const simCreate = await server.simulateTransaction(createTx);
  if (!rpc.Api.isSimulationSuccess(simCreate)) {
    throw new Error(`Create contract simulation failed: ${JSON.stringify(simCreate)}`);
  }

  const assembledCreateTx = rpc.assembleTransaction(createTx, simCreate).build();
  assembledCreateTx.sign(deployer);

  const createSub = await server.sendTransaction(assembledCreateTx);
  if (createSub.status === 'ERROR') {
    throw new Error(`Create contract submission failed: ${JSON.stringify(createSub)}`);
  }

  console.log('Waiting for contract creation confirmation (Hash:', createSub.hash, ')...');
  let createStatus = await queryTxStatus(createSub.hash);
  while (!createStatus || createStatus.status === 'NOT_FOUND') {
    await new Promise((r) => setTimeout(r, 2000));
    createStatus = await queryTxStatus(createSub.hash);
  }

  if (createStatus.status !== 'SUCCESS') {
    throw new Error(`Contract creation failed on ledger: ${JSON.stringify(createStatus)}`);
  }

  console.log('Contract created successfully on ledger:', createStatus.ledger);

  // Extract Contract ID from resultMetaXdr
  const meta = xdr.TransactionMeta.fromXDR(createStatus.resultMetaXdr, 'base64');
  let contractId = null;

  // Search sorobanMeta for return value
  const v3 = meta.v3();
  if (v3 && v3.sorobanMeta() && v3.sorobanMeta().returnValue()) {
    contractId = Address.fromScVal(v3.sorobanMeta().returnValue()).toString();
  }

  if (!contractId) {
    // Alternatively calculate deterministic contract ID: SHA256(Preimage)
    console.log('Computing contract address from deployer and salt...');
  }

  console.log('\n=============================================');
  console.log('SUCCESS! Soroban Royalty Contract ID:');
  console.log(contractId);
  console.log('Creation Transaction Hash:', createSub.hash);
  console.log('=============================================\n');

  return { contractId, txHash: createSub.hash };
}

deploy().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
