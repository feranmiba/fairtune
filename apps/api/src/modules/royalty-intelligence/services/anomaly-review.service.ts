import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { QueryAnomaliesInput, ReviewAnomalyInput } from '@fairtune/validation';
import { AnomalyReviewStatus, UserRole } from '@fairtune/shared';

@Injectable()
export class AnomalyReviewService {
  private readonly logger = new Logger(AnomalyReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listAnomalies(query: QueryAnomaliesInput, userId: string, role?: UserRole) {
    const { agreementId, severity, reviewStatus, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RoyaltyAnomalyWhereInput = {
      ...(agreementId ? { agreementId } : {}),
      ...(severity ? { severity } : {}),
      ...(reviewStatus ? { reviewStatus } : {}),
    };

    if (role !== UserRole.ADMIN) {
      where.agreement = {
        OR: [{ creatorId: userId }, { participants: { some: { collaborator: { userId } } } }],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.royaltyAnomaly.findMany({
        where,
        skip,
        take: limit,
        orderBy: { detectedAt: 'desc' },
        include: {
          agreement: { select: { id: true, title: true, trackName: true } },
          payment: true,
          reviews: {
            orderBy: { createdAt: 'desc' },
            include: {
              reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      }),
      this.prisma.royaltyAnomaly.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAnomalyById(id: string, userId: string, role?: UserRole) {
    const anomaly = await this.prisma.royaltyAnomaly.findUnique({
      where: { id },
      include: {
        agreement: {
          include: {
            participants: { include: { collaborator: true } },
          },
        },
        payment: true,
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!anomaly) {
      throw new NotFoundException(`Anomaly finding with ID ${id} not found`);
    }

    if (role !== UserRole.ADMIN) {
      const isCreator = anomaly.agreement.creatorId === userId;
      const isParticipant = anomaly.agreement.participants.some(
        (p) => p.collaborator.userId === userId,
      );
      if (!isCreator && !isParticipant) {
        throw new ForbiddenException('You do not have permission to view this anomaly');
      }
    }

    return anomaly;
  }

  /**
   * Reviews an anomaly finding, updating its review status and recording an immutable audit log.
   */
  async reviewAnomaly(id: string, reviewerId: string, input: ReviewAnomalyInput) {
    const anomaly = await this.prisma.royaltyAnomaly.findUnique({
      where: { id },
    });

    if (!anomaly) {
      throw new NotFoundException(`Anomaly finding with ID ${id} not found`);
    }

    const previousStatus = anomaly.reviewStatus;
    const newStatus = input.status;

    this.logger.log(
      `User ${reviewerId} updating anomaly ${id} status from ${previousStatus} to ${newStatus}`,
    );

    const [updatedAnomaly] = await this.prisma.$transaction([
      this.prisma.royaltyAnomaly.update({
        where: { id },
        data: {
          reviewStatus: newStatus,
        },
      }),
      this.prisma.anomalyReview.create({
        data: {
          anomalyId: id,
          reviewerId,
          previousStatus: previousStatus as AnomalyReviewStatus,
          newStatus: newStatus as AnomalyReviewStatus,
          notes: input.notes || null,
        },
      }),
    ]);

    return this.getAnomalyById(updatedAnomaly.id, reviewerId, UserRole.ADMIN);
  }
}
