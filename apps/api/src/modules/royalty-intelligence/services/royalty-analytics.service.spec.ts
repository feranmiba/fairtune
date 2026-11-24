import { Test, TestingModule } from '@nestjs/testing';
import { RoyaltyAnalyticsService } from './royalty-analytics.service';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentStatus, UserRole } from '@fairtune/shared';

describe('RoyaltyAnalyticsService', () => {
  let service: RoyaltyAnalyticsService;
  let prisma: any;

  const mockPayments = [
    {
      id: 'pay-1',
      amount: '60.0000000',
      status: PaymentStatus.CONFIRMED,
      confirmedAt: new Date('2026-01-15T10:00:00Z'),
      createdAt: new Date('2026-01-15T10:00:00Z'),
      agreement: { id: 'agr-1', title: 'Single Release', trackName: 'Midnight Groove' },
      collaborator: {
        id: 'c-1',
        displayName: 'Alice Vocalist',
        walletAddress: 'GALICE',
        userId: 'user-alice',
      },
      asset: { code: 'USDC' },
    },
    {
      id: 'pay-2',
      amount: '40.0000000',
      status: PaymentStatus.CONFIRMED,
      confirmedAt: new Date('2026-01-15T10:00:00Z'),
      createdAt: new Date('2026-01-15T10:00:00Z'),
      agreement: { id: 'agr-1', title: 'Single Release', trackName: 'Midnight Groove' },
      collaborator: {
        id: 'c-2',
        displayName: 'Bob Producer',
        walletAddress: 'GBOB',
        userId: 'user-bob',
      },
      asset: { code: 'USDC' },
    },
    {
      id: 'pay-3',
      amount: '150.0000000',
      status: PaymentStatus.CONFIRMED,
      confirmedAt: new Date('2026-02-20T10:00:00Z'),
      createdAt: new Date('2026-02-20T10:00:00Z'),
      agreement: { id: 'agr-2', title: 'Album Track', trackName: 'Sunset Echoes' },
      collaborator: {
        id: 'c-1',
        displayName: 'Alice Vocalist',
        walletAddress: 'GALICE',
        userId: 'user-alice',
      },
      asset: { code: 'USDC' },
    },
  ];

  beforeEach(async () => {
    prisma = {
      payment: {
        findMany: jest.fn().mockResolvedValue(mockPayments),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoyaltyAnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RoyaltyAnalyticsService>(RoyaltyAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getEarningsSummary', () => {
    it('should aggregate total earnings, track breakdown, collaborator breakdown, and monthly trends', async () => {
      const summary = await service.getEarningsSummary('user-alice', UserRole.ARTIST);

      expect(summary.totalEarnings).toBe(250.0); // 60 + 40 + 150
      expect(summary.totalDistributionsCount).toBe(3);

      // Track breakdown
      expect(summary.byTrack).toHaveLength(2);
      const midnightGroove = summary.byTrack.find((t) => t.trackName === 'Midnight Groove');
      expect(midnightGroove?.totalAmount).toBe(100.0);
      expect(midnightGroove?.paymentCount).toBe(2);

      // Collaborator breakdown
      expect(summary.byCollaborator).toHaveLength(2);
      const alice = summary.byCollaborator.find((c) => c.displayName === 'Alice Vocalist');
      expect(alice?.totalAmount).toBe(210.0); // 60 + 150

      // Monthly trends
      expect(summary.monthlyTrends).toHaveLength(2);
      const jan = summary.monthlyTrends.find((m) => m.month === '2026-01');
      expect(jan?.amount).toBe(100.0);
      const feb = summary.monthlyTrends.find((m) => m.month === '2026-02');
      expect(feb?.amount).toBe(150.0);
    });

    it('should cleanly return zero amounts when no confirmed payments exist', async () => {
      prisma.payment.findMany.mockResolvedValue([]);
      const summary = await service.getEarningsSummary('new-user', UserRole.ARTIST);

      expect(summary.totalEarnings).toBe(0);
      expect(summary.totalDistributionsCount).toBe(0);
      expect(summary.byTrack).toHaveLength(0);
      expect(summary.byCollaborator).toHaveLength(0);
      expect(summary.monthlyTrends).toHaveLength(0);
    });
  });
});
