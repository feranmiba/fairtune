import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyReviewService } from './anomaly-review.service';
import { PrismaService } from '../../../database/prisma.service';
import { AnomalyReviewStatus, AnomalySeverity } from '@fairtune/shared';
import { NotFoundException } from '@nestjs/common';

describe('AnomalyReviewService', () => {
  let service: AnomalyReviewService;
  let prisma: any;

  const mockAnomaly = {
    id: 'anom-1',
    agreementId: 'agr-1',
    anomalyType: 'INVALID_SPLIT_TOTAL',
    severity: AnomalySeverity.CRITICAL,
    reviewStatus: AnomalyReviewStatus.PENDING,
    agreement: {
      creatorId: 'user-artist',
      participants: [{ collaborator: { userId: 'user-collab' } }],
    },
  };

  beforeEach(async () => {
    prisma = {
      royaltyAnomaly: {
        findMany: jest.fn().mockResolvedValue([mockAnomaly]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn(),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'anom-1', reviewStatus: AnomalyReviewStatus.RESOLVED }),
      },
      anomalyReview: {
        create: jest.fn().mockResolvedValue({ id: 'rev-1' }),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AnomalyReviewService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AnomalyReviewService>(AnomalyReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reviewAnomaly', () => {
    it('should update anomaly review status and create immutable audit log', async () => {
      prisma.royaltyAnomaly.findUnique.mockResolvedValueOnce(mockAnomaly).mockResolvedValueOnce({
        ...mockAnomaly,
        reviewStatus: AnomalyReviewStatus.RESOLVED,
      });

      const res = await service.reviewAnomaly('anom-1', 'user-reviewer', {
        status: AnomalyReviewStatus.RESOLVED,
        notes: 'Verified that allocations were adjusted on-chain.',
      });

      expect(res.reviewStatus).toBe(AnomalyReviewStatus.RESOLVED);
      expect(prisma.royaltyAnomaly.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'anom-1' },
          data: { reviewStatus: AnomalyReviewStatus.RESOLVED },
        }),
      );
      expect(prisma.anomalyReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            anomalyId: 'anom-1',
            reviewerId: 'user-reviewer',
            previousStatus: AnomalyReviewStatus.PENDING,
            newStatus: AnomalyReviewStatus.RESOLVED,
          }),
        }),
      );
    });

    it('should throw NotFoundException if anomaly does not exist', async () => {
      prisma.royaltyAnomaly.findUnique.mockResolvedValue(null);
      await expect(
        service.reviewAnomaly('unknown', 'user-reviewer', {
          status: AnomalyReviewStatus.RESOLVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
