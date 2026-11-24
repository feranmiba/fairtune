import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { IAgentTool } from '../interfaces/tool.interface';
import { PrismaService } from '../../../../database/prisma.service';

const retrieveRoyaltyAnomaliesSchema = z.object({
  agreementId: z
    .string()
    .uuid()
    .optional()
    .describe('Optional specific agreement ID to filter anomalies'),
  unresolvedOnly: z
    .boolean()
    .default(true)
    .optional()
    .describe('Filter to only pending/in-review findings'),
});

type RetrieveRoyaltyAnomaliesInput = z.infer<typeof retrieveRoyaltyAnomaliesSchema>;

@Injectable()
export class RoyaltyAnomalyRetrieverTool implements IAgentTool<RetrieveRoyaltyAnomaliesInput, any> {
  readonly name = 'retrieve_royalty_anomalies';
  readonly description =
    'Retrieves detected financial and agreement anomalies, discrepancies, severity levels, and AI investigation recommendations for the authenticated artist.';
  readonly schema = retrieveRoyaltyAnomaliesSchema;

  private readonly logger = new Logger(RoyaltyAnomalyRetrieverTool.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: RetrieveRoyaltyAnomaliesInput, context?: { userId: string }): Promise<any> {
    if (!context?.userId) {
      return { error: 'Authentication required to access anomaly reports.' };
    }

    const { agreementId, unresolvedOnly = true } = input;
    this.logger.log(`Executing retrieve_royalty_anomalies for user ${context.userId}`);

    const anomalies = await this.prisma.royaltyAnomaly.findMany({
      where: {
        agreement: {
          OR: [
            { creatorId: context.userId },
            { participants: { some: { collaborator: { userId: context.userId } } } },
          ],
          ...(agreementId ? { id: agreementId } : {}),
        },
        ...(unresolvedOnly ? { reviewStatus: { in: ['PENDING', 'IN_REVIEW'] } } : {}),
      },
      include: {
        agreement: { select: { id: true, title: true, trackName: true } },
      },
      orderBy: { detectedAt: 'desc' },
      take: 20,
    });

    return {
      anomalyCount: anomalies.length,
      anomalies: anomalies.map((a) => ({
        anomalyId: a.id,
        trackName: a.agreement.trackName,
        anomalyType: a.anomalyType,
        severity: a.severity,
        reason: a.detectionReason,
        explanation: a.aiExplanation,
        recommendedActions: a.recommendedActions,
        reviewStatus: a.reviewStatus,
        detectedAt: a.detectedAt.toISOString(),
      })),
      disclaimer:
        'Anomaly findings indicate mathematical or state discrepancies and do not independently establish fraud.',
    };
  }
}
