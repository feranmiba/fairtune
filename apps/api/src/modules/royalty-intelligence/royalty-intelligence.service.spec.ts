import { Test, TestingModule } from '@nestjs/testing';
import { RoyaltyIntelligenceService } from './royalty-intelligence.service';
import { PrismaService } from '../../database/prisma.service';
import { RoyaltyIntelligenceAgent } from '../ai/agents/royalty-agent/royalty-intelligence.agent';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('RoyaltyIntelligenceService', () => {
  let service: RoyaltyIntelligenceService;
  let prisma: any;
  let mockAgent: {
    execute: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      royaltyAgreement: { findUnique: jest.fn() },
      royaltySimulationRecord: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'sim-rec-1',
          ...data,
          createdAt: new Date(),
        })),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sim-rec-1',
            title: 'Master & Publishing Split',
            grossRevenue: 10000,
            netDistributableRevenue: 8000,
          },
        ]),
        findUnique: jest.fn(),
      },
    };

    mockAgent = {
      execute: jest.fn().mockResolvedValue({
        grossRevenue: 10000,
        recoupableExpenses: 2000,
        netDistributableRevenue: 8000,
        participants: [
          {
            collaboratorName: 'Lead Vocalist',
            role: 'Artist',
            percentage: 50,
            allocatedAmount: 4000,
          },
          {
            collaboratorName: 'Producer Beatmaker',
            role: 'Producer',
            percentage: 50,
            allocatedAmount: 4000,
          },
        ],
        unallocatedRemainder: 0,
        currency: 'USD',
        notes: ['All recouped successfully.'],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoyaltyIntelligenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoyaltyIntelligenceAgent, useValue: mockAgent },
      ],
    }).compile();

    service = module.get<RoyaltyIntelligenceService>(RoyaltyIntelligenceService);
  });

  describe('simulateSplits & saveSimulation', () => {
    it('should simulate splits using the deterministic royalty agent', async () => {
      const result = await service.simulateSplits('user-1', {
        grossRevenue: 10000,
        recoupableExpenses: 2000,
        currency: 'USD',
        participants: [
          { collaboratorName: 'Lead Vocalist', role: 'Artist', percentage: 50 },
          { collaboratorName: 'Producer Beatmaker', role: 'Producer', percentage: 50 },
        ],
      });

      expect(result).toBeDefined();
      expect(result.netDistributableRevenue).toBe(8000);
      expect(result.participants).toHaveLength(2);
      expect(result.participants[0]?.allocatedAmount).toBe(4000);
    });

    it('should save simulation records to database', async () => {
      const saved = await service.saveSimulation('user-1', {
        title: 'Album Single Splits',
        grossRevenue: 10000,
        recoupableExpenses: 2000,
        currency: 'USD',
        participants: [
          { collaboratorName: 'Lead Vocalist', role: 'Artist', percentage: 50 },
          { collaboratorName: 'Producer Beatmaker', role: 'Producer', percentage: 50 },
        ],
      });

      expect(saved).toBeDefined();
      expect(saved.simulationId).toBe('sim-rec-1');
      expect(prisma.royaltySimulationRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            title: 'Album Single Splits',
            grossRevenue: 10000,
            netDistributableRevenue: 8000,
          }),
        }),
      );
    });

    it('should list historical simulations for a user', async () => {
      const list = await service.listSimulations('user-1');
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe('sim-rec-1');
    });
  });

  describe('forecastEarnings', () => {
    it('should forecast earnings and strictly separate historical facts from forward estimates', async () => {
      const forecast = await service.forecastEarnings('user-1', {
        title: 'Q1-Q4 Projection',
        currency: 'USD',
        historicalPeriods: [
          { period: '2025-Q1', actualGrossRevenue: 10000, actualRecouped: 2000 },
          { period: '2025-Q2', actualGrossRevenue: 12000, actualRecouped: 0 },
        ],
        projectedGrowthRatePercent: 10,
        projectionPeriodsCount: 2,
        participants: [
          { collaboratorName: 'Lead Vocalist', role: 'Artist', percentage: 60 },
          { collaboratorName: 'Producer', role: 'Producer', percentage: 40 },
        ],
      });

      expect(forecast).toBeDefined();
      expect(forecast.historicalFacts.isHistoricalFact).toBe(true);
      expect(forecast.historicalFacts.totalHistoricalGrossRevenue).toBe(22000);
      expect(forecast.historicalFacts.totalHistoricalRecoupedExpenses).toBe(2000);
      expect(forecast.historicalFacts.periods).toHaveLength(2);

      expect(forecast.forwardEstimates.isHistoricalFact).toBe(false);
      expect(forecast.forwardEstimates.isModelProjection).toBe(true);
      expect(forecast.forwardEstimates.disclaimer).toContain('mathematical estimates');
      expect(forecast.forwardEstimates.projectedPeriods).toHaveLength(2);
    });
  });

  describe('checkAgreementAnomalies', () => {
    it('should detect discrepancy when participant splits do not equal 100%', async () => {
      prisma.royaltyAgreement.findUnique.mockResolvedValue({
        id: 'agreement-1',
        creatorId: 'user-1',
        status: 'PENDING_APPROVAL',
        participants: [
          {
            royaltyPercentage: new Prisma.Decimal('50.00'),
            approvalStatus: 'PENDING',
            collaborator: { userId: 'user-2' },
          },
          {
            royaltyPercentage: new Prisma.Decimal('30.00'), // Sum = 80%
            approvalStatus: 'PENDING',
            collaborator: { userId: 'user-3' },
          },
        ],
        transactions: [],
      });

      const report = await service.checkAgreementAnomalies('user-1', 'agreement-1');

      expect(report.clean).toBe(false);
      expect(report.anomalies.some((a) => a.includes('Discrepancy'))).toBe(true);
    });

    it('should throw ForbiddenException if user is neither creator nor participant', async () => {
      prisma.royaltyAgreement.findUnique.mockResolvedValue({
        id: 'agreement-1',
        creatorId: 'different-creator',
        participants: [],
        transactions: [],
      });

      await expect(
        service.checkAgreementAnomalies('unauthorized-user', 'agreement-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if agreement does not exist', async () => {
      prisma.royaltyAgreement.findUnique.mockResolvedValue(null);

      await expect(service.checkAgreementAnomalies('user-1', 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
