import { Test, TestingModule } from '@nestjs/testing';
import { PaymentSyncService, RawSorobanEvent } from './payment-sync.service';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentsService } from '../../payments/services/payments.service';
import { PaymentAssetService } from '../../payments/services/payment-asset.service';
import { AgreementSyncService } from '../../stellar/services/agreement-sync.service';
import { NotificationService } from '../../notifications/services/notifications.service';
import { AgreementStatus, ApprovalStatus, PaymentStatus } from '@fairtune/shared';

describe('PaymentSyncService', () => {
  let service: PaymentSyncService;
  let prisma: any;
  let paymentsService: any;
  let assetService: any;
  let agreementSyncService: any;
  let notificationService: any;

  const mockAgreement = {
    id: 'agr-1',
    creatorId: 'user-creator',
    onChainAgreementId: '1',
    status: AgreementStatus.ACTIVE,
    paymentTokenAddress: 'CTOKEN_ADDRESS',
    creator: { id: 'user-creator' },
    participants: [
      {
        id: 'p-1',
        collaboratorId: 'c-1',
        royaltyPercentage: '60.00',
        collaborator: { id: 'c-1', walletAddress: 'GCOLLAB1_ADDRESS' },
      },
      {
        id: 'p-2',
        collaboratorId: 'c-2',
        royaltyPercentage: '40.00',
        collaborator: { id: 'c-2', walletAddress: 'GCOLLAB2_ADDRESS' },
      },
    ],
  };

  const mockAsset = {
    id: 'asset-1',
    code: 'USDC',
    contractAddress: 'CTOKEN_ADDRESS',
    decimals: 7,
  };

  beforeEach(async () => {
    prisma = {
      royaltyAgreement: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      agreementParticipant: {
        update: jest.fn(),
      },
      collaborator: {
        findFirst: jest.fn(),
      },
    };

    paymentsService = {
      recordPayment: jest.fn().mockResolvedValue({ id: 'pay-1' }),
    };

    assetService = {
      getAssetByContract: jest.fn().mockResolvedValue(mockAsset),
      listAssets: jest.fn().mockResolvedValue([mockAsset]),
      fromSubunits: jest.fn((subunits, decimals) =>
        (Number(subunits) / 10 ** decimals).toFixed(decimals),
      ),
    };

    agreementSyncService = {
      recordTransaction: jest.fn().mockResolvedValue({ id: 'tx-1' }),
    };

    notificationService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: PaymentAssetService, useValue: assetService },
        { provide: AgreementSyncService, useValue: agreementSyncService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<PaymentSyncService>(PaymentSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processContractEvent - royalties distributed', () => {
    it('should calculate collaborator splits and record payments', async () => {
      prisma.royaltyAgreement.findFirst.mockResolvedValue(mockAgreement);

      const event: RawSorobanEvent = {
        id: 'evt-1',
        type: 'contract',
        ledger: 1058000,
        ledgerClosedAt: '2026-11-24T14:00:00Z',
        contractId: 'CCONTRACT_ID',
        topic: ['royalty', 'distrib', '1'],
        value: ['1000000000', '0'], // 100 USDC distributed, 0 remainder
        txHash: 'tx-hash-distrib-1',
      };

      const res = await service.processContractEvent(event);
      expect(res).toBe(true);

      // Verify participant 1 (60% of 100 = 60 USDC)
      expect(paymentsService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agr-1',
          collaboratorId: 'c-1',
          recipientAddress: 'GCOLLAB1_ADDRESS',
          amountSubunits: '600000000',
          transactionHash: 'tx-hash-distrib-1',
          status: PaymentStatus.CONFIRMED,
        }),
      );

      // Verify participant 2 (40% of 100 = 40 USDC)
      expect(paymentsService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agr-1',
          collaboratorId: 'c-2',
          recipientAddress: 'GCOLLAB2_ADDRESS',
          amountSubunits: '400000000',
          transactionHash: 'tx-hash-distrib-1',
          status: PaymentStatus.CONFIRMED,
        }),
      );

      // Verify ledger transaction recorded
      expect(agreementSyncService.recordTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agr-1',
          transactionHash: 'tx-hash-distrib-1',
          ledgerSequence: 1058000,
        }),
      );
    });

    it('should route remainder dust to creator if remainder > 0', async () => {
      prisma.royaltyAgreement.findFirst.mockResolvedValue(mockAgreement);
      prisma.collaborator.findFirst.mockResolvedValue({
        id: 'c-creator',
        walletAddress: 'GCREATOR_WALLET',
      });

      const event: RawSorobanEvent = {
        id: 'evt-2',
        type: 'contract',
        ledger: 1058001,
        ledgerClosedAt: '2026-11-24T14:00:00Z',
        contractId: 'CCONTRACT_ID',
        topic: ['royalty', 'distrib', '1'],
        value: ['1000000001', '1'], // 1 stroop remainder
        txHash: 'tx-hash-remainder-1',
      };

      const res = await service.processContractEvent(event);
      expect(res).toBe(true);

      // Verify creator received remainder payment
      expect(paymentsService.recordPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          agreementId: 'agr-1',
          recipientAddress: 'GCREATOR_WALLET',
          amountSubunits: '1',
          transactionHash: 'tx-hash-remainder-1',
          status: PaymentStatus.CONFIRMED,
        }),
      );
    });
  });

  describe('processContractEvent - escrow deposited', () => {
    it('should record escrow deposit transaction and mark agreement funded', async () => {
      prisma.royaltyAgreement.findFirst.mockResolvedValue(mockAgreement);

      const event: RawSorobanEvent = {
        id: 'evt-3',
        type: 'contract',
        ledger: 1058002,
        ledgerClosedAt: '2026-11-24T14:00:00Z',
        contractId: 'CCONTRACT_ID',
        topic: ['escrow', 'deposit', '1'],
        value: ['GDEPOSITOR_WALLET', '500000000'],
        txHash: 'tx-hash-dep-1',
      };

      const res = await service.processContractEvent(event);
      expect(res).toBe(true);

      expect(agreementSyncService.recordTransaction).toHaveBeenCalled();
      expect(prisma.royaltyAgreement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'agr-1' },
          data: expect.objectContaining({ onChainStatus: 'FUNDED' }),
        }),
      );
    });
  });

  describe('processContractEvent - collaborator approval', () => {
    it('should mark participant onChainApproved true', async () => {
      prisma.royaltyAgreement.findFirst.mockResolvedValue(mockAgreement);

      const event: RawSorobanEvent = {
        id: 'evt-4',
        type: 'contract',
        ledger: 1058003,
        ledgerClosedAt: '2026-11-24T14:00:00Z',
        contractId: 'CCONTRACT_ID',
        topic: ['agree', 'approved', '1'],
        value: 'GCOLLAB1_ADDRESS',
        txHash: 'tx-hash-appr-1',
      };

      const res = await service.processContractEvent(event);
      expect(res).toBe(true);

      expect(prisma.agreementParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: expect.objectContaining({
            onChainApproved: true,
            approvalStatus: ApprovalStatus.APPROVED,
          }),
        }),
      );
    });
  });
});
