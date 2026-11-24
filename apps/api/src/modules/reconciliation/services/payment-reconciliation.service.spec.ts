import { Test, TestingModule } from '@nestjs/testing';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { PrismaService } from '../../../database/prisma.service';
import { SorobanContractService } from '../../stellar/services/soroban-contract.service';
import { PaymentAssetService } from '../../payments/services/payment-asset.service';
import {
  AgreementStatus,
  AnomalySeverity,
  PaymentStatus,
  ReconciliationStatus,
  StellarTransactionType,
  TransactionStatus,
  UserRole,
} from '@fairtune/shared';

describe('PaymentReconciliationService', () => {
  let service: PaymentReconciliationService;
  let prisma: any;
  let sorobanService: any;
  let assetService: any;

  const mockAgreement = {
    id: 'agr-1',
    creatorId: 'user-creator',
    onChainAgreementId: '1',
    status: AgreementStatus.ACTIVE,
    paymentTokenAddress: 'CTOKEN_ADDRESS',
    participants: [
      {
        id: 'p-1',
        collaboratorId: 'c-1',
        royaltyPercentage: '50.00',
        collaborator: {
          id: 'c-1',
          displayName: 'Alice Vocalist',
          walletAddress: 'GALICE_WALLET',
          userId: 'user-alice',
        },
      },
      {
        id: 'p-2',
        collaboratorId: 'c-2',
        royaltyPercentage: '50.00',
        collaborator: {
          id: 'c-2',
          displayName: 'Bob Producer',
          walletAddress: 'GBOB_WALLET',
          userId: 'user-bob',
        },
      },
    ],
    transactions: [
      {
        id: 'tx-dep',
        transactionHash: 'hash-dep',
        transactionType: StellarTransactionType.ESCROW_DEPOSIT,
        amount: '100.0000000',
        status: TransactionStatus.SUCCESS,
      },
      {
        id: 'tx-dist',
        transactionHash: 'hash-dist',
        transactionType: StellarTransactionType.ROYALTY_DISTRIBUTION,
        amount: '100.0000000',
        status: TransactionStatus.SUCCESS,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        collaboratorId: 'c-1',
        recipientAddress: 'GALICE_WALLET',
        amountSubunits: '500000000',
        status: PaymentStatus.CONFIRMED,
        transactionHash: 'hash-dist',
        collaborator: { walletAddress: 'GALICE_WALLET' },
      },
      {
        id: 'pay-2',
        collaboratorId: 'c-2',
        recipientAddress: 'GBOB_WALLET',
        amountSubunits: '500000000',
        status: PaymentStatus.CONFIRMED,
        transactionHash: 'hash-dist',
        collaborator: { walletAddress: 'GBOB_WALLET' },
      },
    ],
  };

  const mockOnChainData = {
    id: '1',
    totalDeposited: '1000000000', // 100 USDC
    totalDistributed: '1000000000', // 100 USDC
  };

  beforeEach(async () => {
    prisma = {
      royaltyAgreement: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      paymentReconciliation: {
        create: jest.fn().mockImplementation((args) => ({
          id: 'rec-1',
          reconciledAt: new Date(),
          ...args.data,
        })),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      reconciliationFinding: {
        findMany: jest.fn(),
      },
    };

    sorobanService = {
      getAgreement: jest.fn().mockResolvedValue(mockOnChainData),
    };

    assetService = {
      getAssetByContract: jest.fn().mockResolvedValue({ id: 'asset-1', decimals: 7, code: 'USDC' }),
      toSubunits: jest.fn((amt) => (Number(amt) * 10 ** 7).toString()),
      fromSubunits: jest.fn((subunits) => (Number(subunits) / 10 ** 7).toFixed(7)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReconciliationService,
        { provide: PrismaService, useValue: prisma },
        { provide: SorobanContractService, useValue: sorobanService },
        { provide: PaymentAssetService, useValue: assetService },
      ],
    }).compile();

    service = module.get<PaymentReconciliationService>(PaymentReconciliationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reconcileAgreement', () => {
    it('should reconcile cleanly and return MATCHED when all invariants hold', async () => {
      prisma.royaltyAgreement.findUnique.mockResolvedValue(mockAgreement);

      const res = await service.reconcileAgreement('agr-1', 'user-creator', UserRole.ARTIST);

      expect(res.status).toBe(ReconciliationStatus.MATCHED);
      expect(res.discrepancyCount).toBe(0);
      expect(res.findings).toHaveLength(0);
      expect(prisma.paymentReconciliation.create).toHaveBeenCalled();
    });

    it('should flag CRITICAL finding if distribution exceeds deposit', async () => {
      prisma.royaltyAgreement.findUnique.mockResolvedValue(mockAgreement);
      sorobanService.getAgreement.mockResolvedValue({
        id: '1',
        totalDeposited: '500000000',
        totalDistributed: '1000000000', // 100 > 50!
      });

      const res = await service.reconcileAgreement('agr-1', 'user-creator', UserRole.ARTIST);

      expect(res.status).toBe(ReconciliationStatus.PENDING_REVIEW);
      expect(res.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            findingType: 'DISTRIBUTION_EXCEEDS_DEPOSIT',
            severity: AnomalySeverity.CRITICAL,
          }),
        ]),
      );
    });

    it('should flag unexpected recipient destination when wallet does not match', async () => {
      const corruptedAgreement = {
        ...mockAgreement,
        payments: [
          {
            id: 'pay-corrupted',
            collaboratorId: 'c-1',
            recipientAddress: 'G_STRANGER_WALLET', // Mismatch!
            amountSubunits: '500000000',
            status: PaymentStatus.CONFIRMED,
            transactionHash: 'hash-dist',
            collaborator: { walletAddress: 'GALICE_WALLET' },
          },
          mockAgreement.payments[1],
        ],
      };

      prisma.royaltyAgreement.findUnique.mockResolvedValue(corruptedAgreement);

      const res = await service.reconcileAgreement('agr-1', 'user-creator', UserRole.ARTIST);

      expect(res.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            findingType: 'UNEXPECTED_PAYMENT_DESTINATION',
            severity: AnomalySeverity.CRITICAL,
          }),
        ]),
      );
    });
  });
});
