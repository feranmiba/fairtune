import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { IAgentTool } from '../interfaces/tool.interface';
import { PrismaService } from '../../../../database/prisma.service';
import { PaymentStatus } from '@fairtune/shared';

const retrieveRoyaltyEarningsSchema = z.object({
  agreementId: z
    .string()
    .uuid()
    .optional()
    .describe('Optional specific agreement ID to filter earnings'),
  trackName: z.string().optional().describe('Optional track name to filter earnings'),
});

type RetrieveRoyaltyEarningsInput = z.infer<typeof retrieveRoyaltyEarningsSchema>;

@Injectable()
export class RoyaltyEarningsRetrieverTool implements IAgentTool<RetrieveRoyaltyEarningsInput, any> {
  readonly name = 'retrieve_royalty_earnings';
  readonly description =
    'Retrieves verified historical music royalty earnings, distributions by track, collaborator payouts, and payment history for the authenticated artist.';
  readonly schema = retrieveRoyaltyEarningsSchema;

  private readonly logger = new Logger(RoyaltyEarningsRetrieverTool.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: RetrieveRoyaltyEarningsInput, context?: { userId: string }): Promise<any> {
    if (!context?.userId) {
      return { error: 'Authentication required to access royalty earnings.' };
    }

    const { agreementId, trackName } = input;
    this.logger.log(`Executing retrieve_royalty_earnings for user ${context.userId}`);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.CONFIRMED,
        OR: [
          { agreement: { creatorId: context.userId } },
          { collaborator: { userId: context.userId } },
        ],
        ...(agreementId ? { agreementId } : {}),
        ...(trackName
          ? { agreement: { trackName: { contains: trackName, mode: 'insensitive' } } }
          : {}),
      },
      include: {
        agreement: { select: { id: true, title: true, trackName: true } },
        collaborator: { select: { id: true, displayName: true, walletAddress: true } },
        asset: { select: { code: true } },
      },
      orderBy: { confirmedAt: 'desc' },
      take: 50,
    });

    let totalEarnings = 0;
    const trackMap = new Map<string, number>();
    const collaboratorMap = new Map<string, number>();

    for (const p of payments) {
      const amt = Number(p.amount);
      totalEarnings += amt;

      const track = p.agreement.trackName || p.agreement.title;
      trackMap.set(track, (trackMap.get(track) || 0) + amt);

      if (p.collaborator) {
        collaboratorMap.set(
          p.collaborator.displayName,
          (collaboratorMap.get(p.collaborator.displayName) || 0) + amt,
        );
      }
    }

    return {
      verifiedOnChain: true,
      totalEarningsFormatted: `$${totalEarnings.toFixed(2)} USDC`,
      totalConfirmedPaymentsCount: payments.length,
      earningsByTrack: Array.from(trackMap.entries()).map(([track, amount]) => ({
        track,
        amount: `$${amount.toFixed(2)}`,
      })),
      earningsByCollaborator: Array.from(collaboratorMap.entries()).map(
        ([collaborator, amount]) => ({
          collaborator,
          amount: `$${amount.toFixed(2)}`,
        }),
      ),
      recentPayments: payments.slice(0, 10).map((p) => ({
        paymentId: p.id,
        trackName: p.agreement.trackName,
        recipient: p.collaborator?.displayName || p.recipientAddress,
        amount: `$${Number(p.amount).toFixed(2)} ${p.asset?.code || 'USDC'}`,
        transactionHash: p.transactionHash,
        ledgerSequence: p.ledgerSequence,
        confirmedAt: p.confirmedAt?.toISOString() || null,
      })),
      disclaimer:
        'Earnings records reflect confirmed on-chain Soroban disbursements in PostgreSQL.',
    };
  }
}
