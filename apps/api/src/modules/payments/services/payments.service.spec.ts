import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentStatus, UserRole } from '@fairtune/shared';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;

  const mockPayment = {
    id: 'pay-1',
    agreementId: 'agr-1',
    collaboratorId: 'collab-1',
    recipientAddress: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    amount: '50.0000000',
    amountSubunits: '500000000',
    assetId: 'asset-1',
    transactionHash: 'hash-1',
    status: PaymentStatus.CONFIRMED,
    agreement: { creatorId: 'user-artist' },
    collaborator: { userId: 'user-collaborator' },
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        create: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      royaltyAgreement: {
        findUnique: jest.fn(),
      },
      collaborator: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordPayment', () => {
    it('should upsert payment when transactionHash is provided', async () => {
      prisma.payment.upsert.mockResolvedValue(mockPayment);

      const res = await service.recordPayment({
        agreementId: 'agr-1',
        collaboratorId: 'collab-1',
        recipientAddress: mockPayment.recipientAddress,
        amount: '50.0000000',
        amountSubunits: '500000000',
        assetId: 'asset-1',
        transactionHash: 'hash-1',
        status: PaymentStatus.CONFIRMED,
      });

      expect(res).toEqual(mockPayment);
      expect(prisma.payment.upsert).toHaveBeenCalled();
    });

    it('should create payment when transactionHash is omitted', async () => {
      prisma.payment.create.mockResolvedValue(mockPayment);

      const res = await service.recordPayment({
        agreementId: 'agr-1',
        collaboratorId: 'collab-1',
        recipientAddress: mockPayment.recipientAddress,
        amount: '50.0000000',
        amountSubunits: '500000000',
        assetId: 'asset-1',
      });

      expect(res).toEqual(mockPayment);
      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });

  describe('getPaymentById permissions', () => {
    it('should allow agreement creator to view payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      const res = await service.getPaymentById('pay-1', 'user-artist', UserRole.ARTIST);
      expect(res).toEqual(mockPayment);
    });

    it('should allow recipient collaborator to view payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      const res = await service.getPaymentById('pay-1', 'user-collaborator', UserRole.COLLABORATOR);
      expect(res).toEqual(mockPayment);
    });

    it('should reject third party with ForbiddenException', async () => {
      prisma.payment.findUnique.mockResolvedValue(mockPayment);
      await expect(
        service.getPaymentById('pay-1', 'intruder-user', UserRole.ARTIST),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if payment does not exist', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.getPaymentById('unknown', 'user-artist', UserRole.ARTIST),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
