import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  StrKey,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { StellarNetworkService } from './stellar-network.service';

export interface SorobanContractConfig {
  contractId?: string;
  rpcUrl: string;
}

export interface OnChainAgreementData {
  id: string;
  creator: string;
  trackId: string;
  metadataHash: string;
  token: string;
  participants: Array<{ address: string; basisPoints: number }>;
  approvals: string[];
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'FUNDED' | 'COMPLETED' | 'CANCELLED';
  totalDeposited: string;
  totalDistributed: string;
  createdAt: number;
}

@Injectable()
export class SorobanContractService {
  private readonly logger = new Logger(SorobanContractService.name);
  private readonly contractId?: string;
  private readonly dummyAccountPublicKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly networkService: StellarNetworkService,
  ) {
    this.contractId = this.configService.get<string>('stellar.contractId');
    this.dummyAccountPublicKey =
      this.configService.get<string>('stellar.platformPublicKey') ||
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

    if (this.contractId) {
      this.logger.log(`Configured Soroban Royalty Contract ID: ${this.contractId}`);
    } else {
      this.logger.log('Soroban Contract ID not set. Ready for contract deployment in Phase 3.');
    }
  }

  getContractId(): string | undefined {
    return this.contractId;
  }

  isValidContractId(contractId: string): boolean {
    if (!contractId || typeof contractId !== 'string') return false;
    return StrKey.isValidContract(contractId);
  }

  getContractConfig(): SorobanContractConfig {
    return {
      contractId: this.contractId,
      rpcUrl: this.networkService.getRpcUrl(),
    };
  }

  private getDummyAccount(): Account {
    return new Account(this.dummyAccountPublicKey, '0');
  }

  async getAgreement(agreementId: number | string): Promise<OnChainAgreementData | null> {
    if (!this.contractId) return null;

    try {
      const contract = new Contract(this.contractId);
      const server = this.networkService.getRpcServer();
      const passphrase = this.networkService.getNetworkPassphrase();

      const op = contract.call(
        'get_agreement',
        nativeToScVal(BigInt(agreementId), { type: 'u64' }),
      );

      const tx = new TransactionBuilder(this.getDummyAccount(), {
        fee: '100',
        networkPassphrase: passphrase,
      })
        .addOperation(op)
        .setTimeout(30)
        .build();

      const simRes = await server.simulateTransaction(tx);

      if (rpc.Api.isSimulationSuccess(simRes) && simRes.result?.retval) {
        const raw = scValToNative(simRes.result.retval);
        if (!raw) return null;

        const statusMap: Record<number, OnChainAgreementData['status']> = {
          0: 'PENDING_APPROVAL',
          1: 'ACTIVE',
          2: 'FUNDED',
          3: 'COMPLETED',
          4: 'CANCELLED',
        };

        const statusKey = typeof raw.status === 'object' ? Object.keys(raw.status)[0] : raw.status;
        const normalizedStatus =
          typeof statusKey === 'number'
            ? statusMap[statusKey] || 'PENDING_APPROVAL'
            : (statusKey as OnChainAgreementData['status']) || 'PENDING_APPROVAL';

        return {
          id: raw.id ? raw.id.toString() : String(agreementId),
          creator: raw.creator,
          trackId: raw.track_id,
          metadataHash: Buffer.isBuffer(raw.metadata_hash)
            ? raw.metadata_hash.toString('hex')
            : raw.metadata_hash,
          token: raw.token,
          participants: (raw.participants || []).map(
            (p: { address: string; basis_points: number }) => ({
              address: p.address,
              basisPoints: Number(p.basis_points),
            }),
          ),
          approvals: raw.approvals || [],
          status: normalizedStatus,
          totalDeposited: raw.total_deposited ? raw.total_deposited.toString() : '0',
          totalDistributed: raw.total_distributed ? raw.total_distributed.toString() : '0',
          createdAt: Number(raw.created_at || 0),
        };
      }
      return null;
    } catch (err) {
      this.logger.warn(
        `Failed to read on-chain agreement ${agreementId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async getAgreementStatus(agreementId: number | string): Promise<string | null> {
    const agreement = await this.getAgreement(agreementId);
    return agreement ? agreement.status : null;
  }

  async getUndistributedBalance(agreementId: number | string): Promise<bigint> {
    const agreement = await this.getAgreement(agreementId);
    if (!agreement) return BigInt(0);
    const deposited = BigInt(agreement.totalDeposited);
    const distributed = BigInt(agreement.totalDistributed);
    return deposited > distributed ? deposited - distributed : BigInt(0);
  }
}
