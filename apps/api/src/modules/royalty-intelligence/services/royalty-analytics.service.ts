import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentStatus, UserRole } from '@fairtune/shared';

@Injectable()
export class RoyaltyAnalyticsService {
  private readonly logger = new Logger(RoyaltyAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Aggregates factual earnings derived purely from confirmed on-chain payments.
   */
  async getEarningsSummary(userId: string, role?: UserRole) {
    this.logger.log(`Aggregating earnings summary for user ${userId}`);

    // Fetch payments where the user is either the agreement creator or the recipient collaborator
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.CONFIRMED,
        ...(role !== UserRole.ADMIN
          ? {
              OR: [{ agreement: { creatorId: userId } }, { collaborator: { userId } }],
            }
          : {}),
      },
      include: {
        agreement: { select: { id: true, title: true, trackName: true } },
        collaborator: {
          select: { id: true, displayName: true, walletAddress: true, userId: true },
        },
        asset: { select: { code: true } },
      },
      orderBy: { confirmedAt: 'asc' },
    });

    let totalEarnings = 0;
    const trackMap = new Map<
      string,
      { trackName: string; totalAmount: number; paymentCount: number }
    >();
    const collaboratorMap = new Map<
      string,
      { collaboratorId: string; displayName: string; walletAddress: string; totalAmount: number }
    >();
    const assetMap = new Map<string, { assetCode: string; totalAmount: number }>();
    const monthlyMap = new Map<string, { month: string; amount: number; paymentCount: number }>();

    for (const payment of payments) {
      const amountNum = Number(payment.amount);
      totalEarnings += amountNum;

      // By Track
      const trackName = payment.agreement.trackName || payment.agreement.title;
      const trackEntry = trackMap.get(trackName) || { trackName, totalAmount: 0, paymentCount: 0 };
      trackEntry.totalAmount += amountNum;
      trackEntry.paymentCount += 1;
      trackMap.set(trackName, trackEntry);

      // By Collaborator
      if (payment.collaborator) {
        const collabId = payment.collaborator.id;
        const collabEntry = collaboratorMap.get(collabId) || {
          collaboratorId: collabId,
          displayName: payment.collaborator.displayName,
          walletAddress: payment.collaborator.walletAddress,
          totalAmount: 0,
        };
        collabEntry.totalAmount += amountNum;
        collaboratorMap.set(collabId, collabEntry);
      }

      // By Asset
      const assetCode = payment.asset?.code || 'XLM';
      const assetEntry = assetMap.get(assetCode) || { assetCode, totalAmount: 0 };
      assetEntry.totalAmount += amountNum;
      assetMap.set(assetCode, assetEntry);

      // Monthly Trend
      const date = payment.confirmedAt || payment.createdAt;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthEntry = monthlyMap.get(monthKey) || {
        month: monthKey,
        amount: 0,
        paymentCount: 0,
      };
      monthEntry.amount += amountNum;
      monthEntry.paymentCount += 1;
      monthlyMap.set(monthKey, monthEntry);
    }

    return {
      totalEarnings: Number(totalEarnings.toFixed(2)),
      totalDistributionsCount: payments.length,
      currency: 'USDC',
      byTrack: Array.from(trackMap.values()).map((t) => ({
        ...t,
        totalAmount: Number(t.totalAmount.toFixed(2)),
      })),
      byCollaborator: Array.from(collaboratorMap.values()).map((c) => ({
        ...c,
        totalAmount: Number(c.totalAmount.toFixed(2)),
      })),
      byAsset: Array.from(assetMap.values()).map((a) => ({
        ...a,
        totalAmount: Number(a.totalAmount.toFixed(2)),
      })),
      monthlyTrends: Array.from(monthlyMap.values()).map((m) => ({
        ...m,
        amount: Number(m.amount.toFixed(2)),
      })),
    };
  }

  /**
   * Retrieves historical monthly periods from database payments for forecasting inputs.
   */
  async getHistoricalMonthlyPeriods(userId: string) {
    const summary = await this.getEarningsSummary(userId);
    return summary.monthlyTrends.map((trend) => ({
      period: trend.month,
      actualGrossRevenue: trend.amount,
      actualRecouped: 0,
    }));
  }
}
