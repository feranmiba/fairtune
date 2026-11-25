import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  Address,
  Contract,
  Horizon,
  nativeToScVal,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { StellarNetworkService } from './stellar-network.service';
import { SorobanContractService } from './soroban-contract.service';

export interface PreparedTransactionResult {
  unsignedXdr: string;
  minFee: string;
  simulatedSuccess: boolean;
  resourceFee?: string;
  errorMessage?: string;
}

@Injectable()
export class TransactionBuilderService {
  private readonly logger = new Logger(TransactionBuilderService.name);

  constructor(
    private readonly networkService: StellarNetworkService,
    private readonly sorobanContractService: SorobanContractService,
  ) {}

  private async loadAccount(publicKey: string): Promise<Horizon.AccountResponse> {
    try {
      const server = this.networkService.getServer();
      return await server.loadAccount(publicKey);
    } catch {
      throw new BadRequestException(
        `Account ${publicKey} not found or not yet funded on Stellar Testnet. Please fund it with Friendbot.`,
      );
    }
  }

  private getContract(): Contract {
    const contractId = this.sorobanContractService.getContractId();
    if (!contractId) {
      throw new BadRequestException('Soroban royalty contract ID is not configured in environment');
    }
    return new Contract(contractId);
  }

  private async assembleAndSimulate(
    sourceAccount: Horizon.AccountResponse,
    operation: ReturnType<Contract['call']>,
  ): Promise<PreparedTransactionResult> {
    const rpcServer = this.networkService.getRpcServer();
    const passphrase = this.networkService.getNetworkPassphrase();

    // 1. Build initial raw transaction with base fee
    const initialTx = new TransactionBuilder(sourceAccount, {
      fee: '1000',
      networkPassphrase: passphrase,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    // 2. Simulate transaction with Soroban RPC
    const simRes = await rpcServer.simulateTransaction(initialTx);

    if (!rpc.Api.isSimulationSuccess(simRes)) {
      this.logger.warn(`Simulation failed: ${JSON.stringify(simRes)}`);
      return {
        unsignedXdr: initialTx.toXDR(),
        minFee: '1000',
        simulatedSuccess: false,
        errorMessage:
          (simRes as rpc.Api.SimulateTransactionErrorResponse).error || 'Simulation failed',
      };
    }

    // 3. Assemble complete transaction with Soroban resources, footprint & auth
    let assembledTx = initialTx;
    try {
      assembledTx = rpc.assembleTransaction(initialTx, simRes).build();
    } catch {
      assembledTx = initialTx;
    }

    return {
      unsignedXdr: assembledTx.toXDR(),
      minFee: assembledTx.fee,
      simulatedSuccess: true,
      resourceFee: simRes.minResourceFee,
    };
  }

  async buildCreateAgreementTx(params: {
    creatorAddress: string;
    trackId: string;
    metadataHashHex: string;
    tokenAddress: string;
    participants: Array<{ address: string; basisPoints: number }>;
  }): Promise<PreparedTransactionResult> {
    const account = await this.loadAccount(params.creatorAddress);
    const contract = this.getContract();

    // Convert metadata hash from hex to 32 bytes
    const cleanHash = params.metadataHashHex.replace(/^0x/, '');
    if (cleanHash.length !== 64) {
      throw new BadRequestException('Metadata hash must be a 32-byte (64 hex characters) string');
    }
    const hashBuffer = Buffer.from(cleanHash, 'hex');

    // Convert participants to Soroban ScVal with exact u32 basis points
    const participantsScVal = xdr.ScVal.scvVec(
      params.participants.map((p) =>
        xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol('address'),
            val: Address.fromString(p.address).toScVal(),
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol('basis_points'),
            val: xdr.ScVal.scvU32(p.basisPoints),
          }),
        ]),
      ),
    );

    const op = contract.call(
      'create_agreement',
      Address.fromString(params.creatorAddress).toScVal(),
      nativeToScVal(params.trackId, { type: 'string' }),
      nativeToScVal(hashBuffer, { type: 'bytes' }),
      Address.fromString(params.tokenAddress).toScVal(),
      participantsScVal,
    );

    return this.assembleAndSimulate(account, op);
  }

  async buildApproveAgreementTx(params: {
    collaboratorAddress: string;
    onChainAgreementId: string | number;
  }): Promise<PreparedTransactionResult> {
    const account = await this.loadAccount(params.collaboratorAddress);
    const contract = this.getContract();

    const op = contract.call(
      'approve_agreement',
      Address.fromString(params.collaboratorAddress).toScVal(),
      nativeToScVal(BigInt(params.onChainAgreementId), { type: 'u64' }),
    );

    return this.assembleAndSimulate(account, op);
  }

  async buildDepositEscrowTx(params: {
    depositorAddress: string;
    onChainAgreementId: string | number;
    amount: string | bigint;
  }): Promise<PreparedTransactionResult> {
    const account = await this.loadAccount(params.depositorAddress);
    const contract = this.getContract();

    const op = contract.call(
      'deposit_escrow',
      Address.fromString(params.depositorAddress).toScVal(),
      nativeToScVal(BigInt(params.onChainAgreementId), { type: 'u64' }),
      nativeToScVal(BigInt(params.amount), { type: 'i128' }),
    );

    return this.assembleAndSimulate(account, op);
  }

  async buildDistributeRoyaltiesTx(params: {
    callerAddress: string;
    onChainAgreementId: string | number;
  }): Promise<PreparedTransactionResult> {
    const account = await this.loadAccount(params.callerAddress);
    const contract = this.getContract();

    const op = contract.call(
      'distribute_royalties',
      Address.fromString(params.callerAddress).toScVal(),
      nativeToScVal(BigInt(params.onChainAgreementId), { type: 'u64' }),
    );

    return this.assembleAndSimulate(account, op);
  }

  async buildCancelAgreementTx(params: {
    callerAddress: string;
    onChainAgreementId: string | number;
  }): Promise<PreparedTransactionResult> {
    const account = await this.loadAccount(params.callerAddress);
    const contract = this.getContract();

    const op = contract.call(
      'cancel_agreement',
      Address.fromString(params.callerAddress).toScVal(),
      nativeToScVal(BigInt(params.onChainAgreementId), { type: 'u64' }),
    );

    return this.assembleAndSimulate(account, op);
  }
}
