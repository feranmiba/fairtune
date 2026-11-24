import { Test, TestingModule } from '@nestjs/testing';
import { AgreementSyncService } from './agreement-sync.service';
import { PrismaService } from '../../../database/prisma.service';
import { StellarNetworkService } from './stellar-network.service';
import { SorobanContractService } from './soroban-contract.service';
import {
  AgreementStatus,
  ApprovalStatus,
  StellarTransactionType,
  TransactionStatus,
} from '@fairtune/shared';

describe('AgreementSyncService', () => {
  let service: AgreementSyncService;
  let prisma: any;
  let mockNetworkService: any;
  let mockSorobanService: any;

  beforeEach(async () => {
    prisma = {
      royaltyAgreement: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'agree-1',
          ...data,
        })),
      },
      agreementParticipant: {
        update: jest.fn().mockImplementation(({ data }) => ({ ...data })),
      },
      transaction: {
        upsert: jest.fn().mockImplementation(({ create }) => ({
          id: 'tx-1',
          ...create,
        })),
      },
    };

    mockNetworkService = {
      getServer: jest.fn(),
      getRpcServer: jest.fn(),
      getNetworkPassphrase: () => 'Test SDF Network ; September 2015',
    };

    mockSorobanService = {
      getAgreement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgreementSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: StellarNetworkService, useValue: mockNetworkService },
        { provide: SorobanContractService, useValue: mockSorobanService },
      ],
    }).compile();

    service = module.get<AgreementSyncService>(AgreementSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should sync agreement from chain when contract state is Active', async () => {
    prisma.royaltyAgreement.findUnique.mockResolvedValue({
      id: 'agree-1',
      onChainAgreementId: '1',
      status: AgreementStatus.PENDING_APPROVAL,
      participants: [
        {
          id: 'p-1',
          collaborator: {
            walletAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          },
          onChainApproved: false,
        },
      ],
    });

    mockSorobanService.getAgreement.mockResolvedValue({
      id: '1',
      status: 'ACTIVE',
      totalDeposited: '10000',
      totalDistributed: '0',
      approvals: ['GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'],
    });

    const result = await service.syncAgreementFromChain('agree-1');

    expect(result.synced).toBe(true);
    expect(result.onChainStatus).toBe('ACTIVE');
    expect(prisma.agreementParticipant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onChainApproved: true,
          approvalStatus: ApprovalStatus.APPROVED,
        }),
      }),
    );
    expect(prisma.royaltyAgreement.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AgreementStatus.ACTIVE,
          onChainStatus: 'ACTIVE',
        }),
      }),
    );
  });

  it('should record an on-chain transaction idempotently', async () => {
    const tx = await service.recordTransaction({
      agreementId: 'agree-1',
      transactionHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      transactionType: StellarTransactionType.ESCROW_DEPOSIT,
      amount: '5000',
      status: TransactionStatus.SUCCESS,
    });

    expect(tx).toBeDefined();
    expect(prisma.transaction.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          transactionHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        },
        create: expect.objectContaining({
          transactionType: StellarTransactionType.ESCROW_DEPOSIT,
          status: TransactionStatus.SUCCESS,
        }),
      }),
    );
  });
});
