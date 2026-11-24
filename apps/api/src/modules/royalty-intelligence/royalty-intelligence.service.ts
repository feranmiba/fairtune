import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RoyaltyIntelligenceAgent } from '../ai/agents/royalty-agent/royalty-intelligence.agent';
import {
  SimulateRoyaltyInput,
  SaveSimulationInput,
  ForecastEarningsInput,
} from '@fairtune/validation';
import { RoyaltySimulationResult } from '@fairtune/shared';

@Injectable()
export class RoyaltyIntelligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly royaltyAgent: RoyaltyIntelligenceAgent,
  ) {}

  async simulateSplits(
    userId: string,
    input: SimulateRoyaltyInput,
  ): Promise<RoyaltySimulationResult> {
    return this.royaltyAgent.execute(input, { userId });
  }

  async saveSimulation(userId: string, input: SaveSimulationInput) {
    const simulationResult = await this.simulateSplits(userId, input);

    const record = await this.prisma.royaltySimulationRecord.create({
      data: {
        userId,
        title: input.title || `Royalty Split Simulation - ${new Date().toLocaleDateString()}`,
        grossRevenue: input.grossRevenue,
        recoupableExpenses: input.recoupableExpenses,
        netDistributableRevenue: simulationResult.netDistributableRevenue,
        currency: input.currency,
        participantsJson: JSON.parse(JSON.stringify(simulationResult.participants)),
        notesJson: {
          notes: simulationResult.notes,
          unallocatedRemainder: simulationResult.unallocatedRemainder,
        },
      },
    });

    return {
      simulationId: record.id,
      title: record.title,
      createdAt: record.createdAt,
      result: simulationResult,
    };
  }

  async listSimulations(userId: string) {
    return this.prisma.royaltySimulationRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSimulationById(userId: string, simulationId: string) {
    const simulation = await this.prisma.royaltySimulationRecord.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) {
      throw new NotFoundException('Simulation record not found');
    }

    if (simulation.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this simulation');
    }

    return simulation;
  }

  async forecastEarnings(_userId: string, input: ForecastEarningsInput) {
    // 1. Analyze historical factual periods
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
    const avgHistoricalGrossCents = Math.round(totalHistoricalGrossCents / historicalCount);
    const lastHistoricalGrossCents = Math.round(
      (input.historicalPeriods[historicalCount - 1]?.actualGrossRevenue ?? 0) * 100,
    );

    // Participant cumulative historical totals
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

    // 2. Generate forward mathematical estimates (clearly isolated from facts)
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
      currency: input.currency,
      generatedAt: new Date().toISOString(),
      historicalFacts,
      forwardEstimates,
    };
  }

  async checkAgreementAnomalies(userId: string, agreementId: string) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: {
          include: { collaborator: true },
        },
        transactions: true,
      },
    });

    if (!agreement) {
      throw new NotFoundException('Royalty agreement not found');
    }

    const isCreator = agreement.creatorId === userId;
    const isParticipant = agreement.participants.some((p) => p.collaborator.userId === userId);

    if (!isCreator && !isParticipant) {
      throw new ForbiddenException(
        'You do not have permission to view anomalies for this agreement',
      );
    }

    const anomalies: string[] = [];

    // 1. Verify participant split sum
    const totalPercentage = agreement.participants.reduce(
      (acc, p) => acc + Number(p.royaltyPercentage),
      0,
    );
    if (Math.abs(totalPercentage - 100.0) > 0.01) {
      anomalies.push(
        `Discrepancy: Total participant split equals ${totalPercentage}%, expected 100.00%.`,
      );
    }

    // 2. Check for pending approvals on active agreements
    if (agreement.status === 'ACTIVE') {
      const pendingParticipants = agreement.participants.filter(
        (p) => p.approvalStatus !== 'APPROVED',
      );
      if (pendingParticipants.length > 0) {
        anomalies.push(
          `Security Warning: Agreement marked ACTIVE while ${pendingParticipants.length} participant(s) remain in PENDING approval state.`,
        );
      }
    }

    // 3. Check transaction duplicates
    const txHashes = agreement.transactions.map((t) => t.transactionHash);
    const uniqueTxHashes = new Set(txHashes);
    if (txHashes.length !== uniqueTxHashes.size) {
      anomalies.push('Duplicate transaction hashes detected for this agreement ledger.');
    }

    return {
      agreementId,
      status: agreement.status,
      anomalyCount: anomalies.length,
      anomalies,
      clean: anomalies.length === 0,
    };
  }
}
