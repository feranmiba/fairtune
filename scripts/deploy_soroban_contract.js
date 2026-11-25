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
  StrKey,
} = require(sdkPath);

const RPC_URL = 'https://soroban-testnet.stellar.org';
const PASSPHRASE = Networks.TESTNET;
const WASM_PATH = path.join(
  __dirname,
  '../contracts/royalty-agreement/target/wasm32-unknown-unknown/release/fairtune_royalty_agreement.wasm',
);

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

  // Load account sequence
  const account = await server.getAccount(deployer.publicKey());

  // 3. Upload Contract WASM
  console.log('Uploading WASM to Soroban Testnet...');
  const wasm = fs.readFileSync(WASM_PATH);
  const uploadOp = Operation.uploadContractWasm({ wasm });

  const uploadTx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(300)
    .build();

  const simUpload = await server.simulateTransaction(uploadTx);
  if (!rpc.Api.isSimulationSuccess(simUpload)) {
    throw new Error(`WASM upload simulation failed: ${JSON.stringify(simUpload)}`);
  }

  const assembledUploadTx = rpc.assembleTransaction(uploadTx, simUpload).build();
  assembledUploadTx.sign(deployer);

  const uploadSub = await server.sendTransaction(assembledUploadTx);
  if (uploadSub.status === 'ERROR') {
    throw new Error(`WASM upload submission failed: ${JSON.stringify(uploadSub)}`);
  }

  console.log('Waiting for WASM upload confirmation (Hash:', uploadSub.hash, ')...');
  let uploadStatus = await server.getTransaction(uploadSub.hash);
  while (uploadStatus.status === 'NOT_FOUND') {
    await new Promise((r) => setTimeout(r, 1500));
    uploadStatus = await server.getTransaction(uploadSub.hash);
  }

  if (uploadStatus.status !== 'SUCCESS') {
    throw new Error(`WASM upload failed on ledger: ${JSON.stringify(uploadStatus)}`);
  }

  const wasmHash = uploadStatus.returnValue.bytes();
  console.log('WASM Hash:', wasmHash.toString('hex'));

  // 4. Create Contract Instance
  console.log('Creating contract instance...');
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
  let createStatus = await server.getTransaction(createSub.hash);
  while (createStatus.status === 'NOT_FOUND') {
    await new Promise((r) => setTimeout(r, 1500));
    createStatus = await server.getTransaction(createSub.hash);
  }

  if (createStatus.status !== 'SUCCESS') {
    throw new Error(`Contract creation failed on ledger: ${JSON.stringify(createStatus)}`);
  }

  // Contract address is in the return value (Address ScVal)
  const contractId = Address.fromScVal(createStatus.returnValue).toString();
  console.log('\n=============================================');
  console.log('SUCCESS! Soroban Royalty Contract ID:');
  console.log(contractId);
  console.log('=============================================\n');

  return contractId;
}

deploy().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
