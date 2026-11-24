import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { PrismaService } from '../../../database/prisma.service';
import { AiProviderFactory } from '../../ai/providers/provider.factory';
import { AgreementStatus, AnomalySeverity, PaymentStatus, UserRole } from '@fairtune/shared';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let prisma: any;
  let providerFactory: any;
  let mockProvider: any;

  const mockAgreement = {
    id: 'agr-1',
    creatorId: 'user-artist',
    trackName: 'Midnight Groove',
    status: AgreementStatus.ACTIVE,
    participants: [
      {
        id: 'p-1',
        royaltyPercentage: '50.00',
        onChainApproved: true,
        approvalStatus: 'APPROVED',
        collaborator: { walletAddress: 'GALICE' },
      },
      {
        id: 'p-2',
        royaltyPercentage: '40.00', // Total = 90% (discrepancy!)
        onChainApproved: true,
        approvalStatus: 'APPROVED',
        collaborator: { walletAddress: 'GBOB' },
      },
    ],
    transactions: [],
    payments: [],
  };

  beforeEach(async () => {
    prisma = {
      royaltyAgreement: {
        findUnique: jest.fn(),
      },
      royaltyAnomaly: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: 'anom-1', ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: 'anom-1', ...args.data })),
      },
    };

    mockProvider = {
      generateText: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          explanation: 'Allocations do not equal 100%.',
          recommendedActions: 'Adjust collaborator splits to total 100%.',
        }),
      }),
    };

    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiProviderFactory, useValue: providerFactory },
      ],
    }).compile();

    service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectAgreementAnomalies', () => {
    it('should detect invalid split totals and generate AI explanation', async () => {
      prisma.royaltyAgreement.findUnique.mockResolvedValue(mockAgreement);

      const res = await service.detectAgreementAnomalies('agr-1', 'user-artist', UserRole.ARTIST);

      expect(res.anomalyCount).toBeGreaterThan(0);
      const splitAnomaly = res.anomalies.find((a) => a.anomalyType === 'INVALID_SPLIT_TOTAL');
      expect(splitAnomaly).toBeDefined();
      expect(splitAnomaly?.severity).toBe(AnomalySeverity.CRITICAL);
      expect(mockProvider.generateText).toHaveBeenCalled();
      expect(prisma.royaltyAnomaly.create).toHaveBeenCalled();
    });

    it('should detect active agreement with pending collaborator approvals', async () => {
      const pendingAgreement = {
        ...mockAgreement,
        participants: [
          mockAgreement.participants[0],
          {
            ...mockAgreement.participants[1],
            royaltyPercentage: '50.00',
            onChainApproved: false, // Unapproved!
            approvalStatus: 'PENDING',
          },
        ],
      };
      prisma.royaltyAgreement.findUnique.mockResolvedValue(pendingAgreement);

      const res = await service.detectAgreementAnomalies('agr-1', 'user-artist', UserRole.ARTIST);

      const approvalAnomaly = res.anomalies.find(
        (a) => a.anomalyType === 'ACTIVE_WITH_PENDING_APPROVALS',
      );
      expect(approvalAnomaly).toBeDefined();
      expect(approvalAnomaly?.severity).toBe(AnomalySeverity.HIGH);
    });

    it('should detect payment destination address mismatch', async () => {
      const destinationMismatchAgreement = {
        ...mockAgreement,
        participants: [
          {
            ...mockAgreement.participants[0],
            royaltyPercentage: '50.00',
          },
          {
            ...mockAgreement.participants[1],
            royaltyPercentage: '50.00',
          },
        ],
        payments: [
          {
            id: 'pay-diverted',
            status: PaymentStatus.CONFIRMED,
            recipientAddress: 'GSTRANGER_WALLET', // Wrong address!
            collaborator: { walletAddress: 'GALICE' },
          },
        ],
      };
      prisma.royaltyAgreement.findUnique.mockResolvedValue(destinationMismatchAgreement);

      const res = await service.detectAgreementAnomalies('agr-1', 'user-artist', UserRole.ARTIST);

      const destAnomaly = res.anomalies.find(
        (a) => a.anomalyType === 'PAYMENT_DESTINATION_MISMATCH',
      );
      expect(destAnomaly).toBeDefined();
      expect(destAnomaly?.severity).toBe(AnomalySeverity.CRITICAL);
    });
  });
});
