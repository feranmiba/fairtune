import { Injectable, Logger } from '@nestjs/common';
import { ForecastEarningsInput } from '@fairtune/validation';

export interface ForecastResult {
  title: string;
  currency: string;
  generatedAt: string;
  confidenceScore: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  historicalFacts: {
    isHistoricalFact: boolean;
    periodsAnalyzed: number;
    totalHistoricalGrossRevenue: number;
    totalHistoricalRecoupedExpenses: number;
    averageHistoricalGrossPerPeriod: number;
    participantHistoricalTotals: Array<{
      collaboratorName: string;
      role: string;
      percentage: number;
      totalHistoricalEarnings: number;
    }>;
    periods: Array<{
      period: string;
      grossRevenue: number;
      recoupedExpenses: number;
      netDistributable: number;
      participantDistributions: Array<{
        collaboratorName: string;
        role: string;
        percentage: number;
        actualEarnings: number;
      }>;
    }>;
  };
  forwardEstimates: {
    isHistoricalFact: boolean;
    isModelProjection: boolean;
    projectedGrowthRatePercent: number;
    projectionPeriodsCount: number;
    cumulativeProjectedGrossRevenue: number;
    participantProjectedTotals: Array<{
      collaboratorName: string;
      role: string;
      percentage: number;
      cumulativeProjectedEarnings: number;
    }>;
    projectedPeriods: Array<{
      projectionPeriodIndex: number;
      projectedGrossRevenue: number;
      participantSplits: Array<{
        collaboratorName: string;
        role: string;
        percentage: number;
        projectedShare: number;
      }>;
    }>;
    disclaimer: string;
  };
}

@Injectable()
export class RoyaltyForecastingService {
  private readonly logger = new Logger(RoyaltyForecastingService.name);

  generateForecast(input: ForecastEarningsInput): ForecastResult {
    this.logger.log(
      `Generating royalty forecast across ${input.historicalPeriods.length} historical periods`,
    );

    let totalHistoricalGrossCents = 0;
    let totalHistoricalRecoupedCents = 0;

    const historicalPeriodBreakdowns = input.historicalPeriods.map((p) => {
      const grossCents = Math.round(p.actualGrossRevenue * 100);
      const recoupedCents = Math.round(p.actualRecouped * 100);
      const netCents = Math.max(0, grossCents - recoupedCents);

      totalHistoricalGrossCents += grossCents;
      totalHistoricalRecoupedCents += recoupedCents;

      const participantDistributions = input.participants.map((participant) => {
        const participantCents = Math.round((netCents * participant.percentage) / 100);
        return {
          collaboratorName: participant.collaboratorName,
          role: participant.role,
          percentage: participant.percentage,
          actualEarnings: Number((participantCents / 100).toFixed(2)),
        };
      });

      return {
        period: p.period,
        grossRevenue: p.actualGrossRevenue,
        recoupedExpenses: p.actualRecouped,
        netDistributable: Number((netCents / 100).toFixed(2)),
        participantDistributions,
      };
    });

    const historicalCount = input.historicalPeriods.length;
    const avgHistoricalGrossCents =
      historicalCount > 0 ? Math.round(totalHistoricalGrossCents / historicalCount) : 0;

    const lastHistoricalGrossCents =
      historicalCount > 0
        ? Math.round((input.historicalPeriods[historicalCount - 1]?.actualGrossRevenue ?? 0) * 100)
        : 0;

    // Confidence determination
    let confidenceScore = 0.4;
    let confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (historicalCount >= 6) {
      confidenceScore = 0.85;
      confidenceLevel = 'HIGH';
    } else if (historicalCount >= 3) {
      confidenceScore = 0.7;
      confidenceLevel = 'MEDIUM';
    }

    const participantHistoricalTotals = input.participants.map((participant) => {
      const netTotalCents = Math.max(0, totalHistoricalGrossCents - totalHistoricalRecoupedCents);
      const totalEarningsCents = Math.round((netTotalCents * participant.percentage) / 100);
      return {
        collaboratorName: participant.collaboratorName,
        role: participant.role,
        percentage: participant.percentage,
        totalHistoricalEarnings: Number((totalEarningsCents / 100).toFixed(2)),
      };
    });

    const historicalFacts = {
      isHistoricalFact: true,
      periodsAnalyzed: historicalCount,
      totalHistoricalGrossRevenue: Number((totalHistoricalGrossCents / 100).toFixed(2)),
      totalHistoricalRecoupedExpenses: Number((totalHistoricalRecoupedCents / 100).toFixed(2)),
      averageHistoricalGrossPerPeriod: Number((avgHistoricalGrossCents / 100).toFixed(2)),
      participantHistoricalTotals,
      periods: historicalPeriodBreakdowns,
    };

    // Forward estimates
    let currentBaseGrossCents =
      lastHistoricalGrossCents > 0 ? lastHistoricalGrossCents : avgHistoricalGrossCents;
    const growthMultiplier = 1 + input.projectedGrowthRatePercent / 100;
    let projectedCumulativeGrossCents = 0;
    const projectedPeriods = [];

    for (let i = 1; i <= input.projectionPeriodsCount; i++) {
      currentBaseGrossCents = Math.round(currentBaseGrossCents * growthMultiplier);
      projectedCumulativeGrossCents += currentBaseGrossCents;

      const periodParticipantSplits = input.participants.map((participant) => {
        const shareCents = Math.round((currentBaseGrossCents * participant.percentage) / 100);
        return {
          collaboratorName: participant.collaboratorName,
          role: participant.role,
          percentage: participant.percentage,
          projectedShare: Number((shareCents / 100).toFixed(2)),
        };
      });

      projectedPeriods.push({
        projectionPeriodIndex: i,
        projectedGrossRevenue: Number((currentBaseGrossCents / 100).toFixed(2)),
        participantSplits: periodParticipantSplits,
      });
    }

    const participantProjectedTotals = input.participants.map((participant) => {
      const totalProjectedCents = Math.round(
        (projectedCumulativeGrossCents * participant.percentage) / 100,
      );
      return {
        collaboratorName: participant.collaboratorName,
        role: participant.role,
        percentage: participant.percentage,
        cumulativeProjectedEarnings: Number((totalProjectedCents / 100).toFixed(2)),
      };
    });

    const forwardEstimates = {
      isHistoricalFact: false,
      isModelProjection: true,
      projectedGrowthRatePercent: input.projectedGrowthRatePercent,
      projectionPeriodsCount: input.projectionPeriodsCount,
      cumulativeProjectedGrossRevenue: Number((projectedCumulativeGrossCents / 100).toFixed(2)),
      participantProjectedTotals,
      projectedPeriods,
      disclaimer:
        'Forward-looking earnings projections are mathematical estimates and do not guarantee future royalty revenues. Projections do not account for external streaming algorithm shifts, distributor fee revisions, or force majeure events.',
    };

    return {
      title: input.title || 'Music Royalty Earnings Forecast',
      currency: input.currency || 'USDC',
      generatedAt: new Date().toISOString(),
      confidenceScore,
      confidenceLevel,
      historicalFacts,
      forwardEstimates,
    };
  }
}
