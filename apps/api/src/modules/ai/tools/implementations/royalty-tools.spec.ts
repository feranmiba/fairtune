import { Test, TestingModule } from '@nestjs/testing';
import { RoyaltyEarningsRetrieverTool } from './royalty-earnings-retriever.tool';
import { RoyaltyAnomalyRetrieverTool } from './royalty-anomaly-retriever.tool';
import { PrismaService } from '../../../../database/prisma.service';
import { AnomalySeverity, PaymentStatus } from '@fairtune/shared';

describe('AI Royalty Assistant Tools', () => {
  let earningsTool: RoyaltyEarningsRetrieverTool;
  let anomalyTool: RoyaltyAnomalyRetrieverTool;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      payment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p-1',
            amount: '75.0000000',
            status: PaymentStatus.CONFIRMED,
            transactionHash: '0xhash1',
            ledgerSequence: 1000,
            confirmedAt: new Date('2026-02-01T12:00:00Z'),
            agreement: { id: 'agr-1', title: 'Summer Hit', trackName: 'Summer Beats' },
            collaborator: { displayName: 'Alice' },
            asset: { code: 'USDC' },
          },
        ]),
      },
      royaltyAnomaly: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'anom-1',
            agreementId: 'agr-1',
            anomalyType: 'INVALID_SPLIT_TOTAL',
            severity: AnomalySeverity.CRITICAL,
            detectionReason: 'Splits sum to 95%',
            aiExplanation: 'Allocations are incomplete.',
            recommendedActions: 'Add remaining 5%.',
            reviewStatus: 'PENDING',
            detectedAt: new Date('2026-02-01T12:00:00Z'),
            agreement: { trackName: 'Summer Beats' },
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoyaltyEarningsRetrieverTool,
        RoyaltyAnomalyRetrieverTool,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    earningsTool = module.get<RoyaltyEarningsRetrieverTool>(RoyaltyEarningsRetrieverTool);
    anomalyTool = module.get<RoyaltyAnomalyRetrieverTool>(RoyaltyAnomalyRetrieverTool);
  });

  it('RoyaltyEarningsRetrieverTool should retrieve verified on-chain earnings and format output', async () => {
    const res = await earningsTool.execute({}, { userId: 'user-artist' });

    expect(res.verifiedOnChain).toBe(true);
    expect(res.totalEarningsFormatted).toBe('$75.00 USDC');
    expect(res.earningsByTrack).toEqual([{ track: 'Summer Beats', amount: '$75.00' }]);
    expect(res.recentPayments).toHaveLength(1);
    expect(res.disclaimer).toBeDefined();
  });

  it('RoyaltyEarningsRetrieverTool should require authentication', async () => {
    const res = await earningsTool.execute({});
    expect(res.error).toContain('Authentication required');
  });

  it('RoyaltyAnomalyRetrieverTool should retrieve detected anomalies for user agreements', async () => {
    const res = await anomalyTool.execute({}, { userId: 'user-artist' });

    expect(res.anomalyCount).toBe(1);
    expect(res.anomalies[0].anomalyType).toBe('INVALID_SPLIT_TOTAL');
    expect(res.anomalies[0].severity).toBe(AnomalySeverity.CRITICAL);
    expect(res.disclaimer).toContain('mathematical or state discrepancies');
  });

  it('RoyaltyAnomalyRetrieverTool should require authentication', async () => {
    const res = await anomalyTool.execute({});
    expect(res.error).toContain('Authentication required');
  });
});
