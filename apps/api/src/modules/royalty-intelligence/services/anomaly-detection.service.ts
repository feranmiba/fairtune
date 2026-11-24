import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AiProviderFactory } from '../../ai/providers/provider.factory';
import {
  ANOMALY_EXPLANATION_SYSTEM_PROMPT,
  buildAnomalyExplanationPrompt,
} from '../../ai/prompts/anomaly-explanation.prompt';
import {
  AnomalyReviewStatus,
  AnomalySeverity,
  PaymentStatus,
  StellarTransactionType,
  TransactionStatus,
  UserRole,
} from '@fairtune/shared';

export interface DetectedAnomalyItem {
  id?: string;
  agreementId: string;
  paymentId?: string | null;
  anomalyType: string;
  severity: AnomalySeverity;
  detectionReason: string;
  expectedValue?: string | null;
  observedValue?: string | null;
  aiExplanation?: string | null;
  recommendedActions?: string | null;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: AiProviderFactory,
  ) {}

  /**
   * Scans an agreement for deterministic anomalies, generates AI explanations, and records findings.
   */
  async detectAgreementAnomalies(
    agreementId: string,
    userId: string,
    role?: UserRole,
  ): Promise<{
    agreementId: string;
    anomalyCount: number;
    anomalies: DetectedAnomalyItem[];
  }> {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id: agreementId },
      include: {
        creator: true,
        participants: { include: { collaborator: true } },
        transactions: true,
        payments: { include: { collaborator: true } },
      },
    });

    if (!agreement) {
      throw new NotFoundException(`Royalty agreement ${agreementId} not found`);
    }

    if (role !== UserRole.ADMIN) {
      const isCreator = agreement.creatorId === userId;
      const isParticipant = agreement.participants.some((p) => p.collaborator.userId === userId);
      if (!isCreator && !isParticipant) {
        throw new ForbiddenException(
          'You do not have permission to inspect anomalies for this agreement',
        );
      }
    }

    this.logger.log(`Running anomaly detection scan on agreement ${agreementId}`);
    const rawAnomalies: DetectedAnomalyItem[] = [];

    // --- RULE 1: Allocation split sum check ---
    const totalPercentage = agreement.participants.reduce(
      (sum, p) => sum + Number(p.royaltyPercentage),
      0,
    );
    if (Math.abs(totalPercentage - 100.0) > 0.01) {
      rawAnomalies.push({
        agreementId: agreement.id,
        anomalyType: 'INVALID_SPLIT_TOTAL',
        severity: AnomalySeverity.CRITICAL,
        detectionReason: `Participant royalty allocations sum to ${totalPercentage.toFixed(2)}%, but contract law and financial integrity require exactly 100.00%`,
        expectedValue: '100.00%',
        observedValue: `${totalPercentage.toFixed(2)}%`,
      });
    }

    // --- RULE 2: Active agreement with pending collaborator approvals ---
    if (agreement.status === 'ACTIVE') {
      const pendingParticipants = agreement.participants.filter(
        (p) => !p.onChainApproved || p.approvalStatus !== 'APPROVED',
      );
      if (pendingParticipants.length > 0) {
        rawAnomalies.push({
          agreementId: agreement.id,
          anomalyType: 'ACTIVE_WITH_PENDING_APPROVALS',
          severity: AnomalySeverity.HIGH,
          detectionReason: `Agreement marked ACTIVE while ${pendingParticipants.length} collaborator(s) have not submitted confirmed on-chain approval`,
          expectedValue: 'All participants approved',
          observedValue: `${pendingParticipants.length} approval(s) pending`,
        });
      }
    }

    // --- RULE 3: Duplicate collaborator addresses ---
    const seenAddresses = new Set<string>();
    for (const p of agreement.participants) {
      const addr = p.collaborator.walletAddress;
      if (seenAddresses.has(addr)) {
        rawAnomalies.push({
          agreementId: agreement.id,
          anomalyType: 'DUPLICATE_COLLABORATOR_ADDRESS',
          severity: AnomalySeverity.HIGH,
          detectionReason: `Wallet address ${addr} appears multiple times in the participant roster`,
          expectedValue: 'Unique collaborator addresses',
          observedValue: addr,
        });
      }
      seenAddresses.add(addr);
    }

    // --- RULE 4: Payments made under non-active agreement ---
    if (agreement.status !== 'ACTIVE' && agreement.payments.length > 0) {
      const confirmedPays = agreement.payments.filter((p) => p.status === PaymentStatus.CONFIRMED);
      if (confirmedPays.length > 0) {
        rawAnomalies.push({
          agreementId: agreement.id,
          anomalyType: 'PAYMENTS_ON_INACTIVE_AGREEMENT',
          severity: AnomalySeverity.CRITICAL,
          detectionReason: `Agreement status is ${agreement.status}, but ${confirmedPays.length} confirmed payment(s) are recorded in the ledger`,
          expectedValue: 'ACTIVE',
          observedValue: agreement.status,
        });
      }
    }

    // --- RULE 5: Payment destination mismatch ---
    for (const payment of agreement.payments) {
      if (
        payment.collaborator &&
        payment.status === PaymentStatus.CONFIRMED &&
        payment.recipientAddress !== payment.collaborator.walletAddress
      ) {
        rawAnomalies.push({
          agreementId: agreement.id,
          paymentId: payment.id,
          anomalyType: 'PAYMENT_DESTINATION_MISMATCH',
          severity: AnomalySeverity.CRITICAL,
          detectionReason: `Payment was sent to ${payment.recipientAddress}, which does not match collaborator registered address ${payment.collaborator.walletAddress}`,
          expectedValue: payment.collaborator.walletAddress,
          observedValue: payment.recipientAddress,
        });
      }
    }

    // --- RULE 6: Duplicate payment records in same transaction ---
    const seenTxRecipients = new Set<string>();
    for (const payment of agreement.payments) {
      if (payment.transactionHash && payment.status === PaymentStatus.CONFIRMED) {
        const key = `${payment.transactionHash}_${payment.recipientAddress}`;
        if (seenTxRecipients.has(key)) {
          rawAnomalies.push({
            agreementId: agreement.id,
            paymentId: payment.id,
            anomalyType: 'DUPLICATE_PAYMENT_TX',
            severity: AnomalySeverity.HIGH,
            detectionReason: `Multiple confirmed payments detected for recipient ${payment.recipientAddress} in transaction ${payment.transactionHash}`,
            expectedValue: 'Single payment per transaction',
            observedValue: payment.transactionHash,
          });
        }
        seenTxRecipients.add(key);
      }
    }

    // --- RULE 7: Distribution exceeds deposits ---
    let totalDeposited = 0;
    let totalDistributed = 0;
    for (const tx of agreement.transactions) {
      if (tx.status === TransactionStatus.SUCCESS) {
        const amt = Number(tx.amount);
        if (tx.transactionType === StellarTransactionType.ESCROW_DEPOSIT) {
          totalDeposited += amt;
        } else if (tx.transactionType === StellarTransactionType.ROYALTY_DISTRIBUTION) {
          totalDistributed += amt;
        }
      }
    }
    if (totalDistributed > totalDeposited) {
      rawAnomalies.push({
        agreementId: agreement.id,
        anomalyType: 'DISTRIBUTION_EXCEEDS_ESCROW',
        severity: AnomalySeverity.CRITICAL,
        detectionReason: `Total recorded distributions (${totalDistributed.toFixed(2)}) exceed total confirmed escrow deposits (${totalDeposited.toFixed(2)})`,
        expectedValue: `<=${totalDeposited.toFixed(2)}`,
        observedValue: totalDistributed.toFixed(2),
      });
    }

    // Generate AI explanations and persist anomalies
    const provider = this.providerFactory.getProvider();
    const persistedAnomalies: DetectedAnomalyItem[] = [];

    for (const item of rawAnomalies) {
      let aiExplanation = item.detectionReason;
      let recommendedActions = 'Please verify on-chain transaction history with collaborators.';

      try {
        const prompt = buildAnomalyExplanationPrompt({
          anomalyType: item.anomalyType,
          severity: item.severity,
          detectionReason: item.detectionReason,
          expectedValue: item.expectedValue,
          observedValue: item.observedValue,
          trackName: agreement.trackName,
        });

        const aiResponse = await provider.generateText(
          [
            { role: 'system', content: ANOMALY_EXPLANATION_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          {
            temperature: 0.1,
            maxTokens: 400,
          },
        );

        try {
          const parsed = JSON.parse(aiResponse.text);
          if (parsed.explanation) aiExplanation = parsed.explanation;
          if (parsed.recommendedActions) recommendedActions = parsed.recommendedActions;
        } catch {
          aiExplanation = aiResponse.text;
        }
      } catch (err) {
        this.logger.warn(
          `AI explanation failed for anomaly ${item.anomalyType}: ${(err as Error).message}`,
        );
      }

      // Check if an identical active anomaly already exists
      const existing = await this.prisma.royaltyAnomaly.findFirst({
        where: {
          agreementId: item.agreementId,
          anomalyType: item.anomalyType,
          reviewStatus: { in: [AnomalyReviewStatus.PENDING, AnomalyReviewStatus.IN_REVIEW] },
        },
      });

      let savedRecord;
      if (existing) {
        savedRecord = await this.prisma.royaltyAnomaly.update({
          where: { id: existing.id },
          data: {
            severity: item.severity,
            detectionReason: item.detectionReason,
            expectedValue: item.expectedValue,
            observedValue: item.observedValue,
            aiExplanation,
            recommendedActions,
            paymentId: item.paymentId || existing.paymentId,
          },
        });
      } else {
        savedRecord = await this.prisma.royaltyAnomaly.create({
          data: {
            agreementId: item.agreementId,
            paymentId: item.paymentId || null,
            anomalyType: item.anomalyType,
            severity: item.severity,
            detectionReason: item.detectionReason,
            expectedValue: item.expectedValue,
            observedValue: item.observedValue,
            aiExplanation,
            recommendedActions,
          },
        });
      }

      persistedAnomalies.push({
        id: savedRecord.id,
        agreementId: savedRecord.agreementId,
        paymentId: savedRecord.paymentId,
        anomalyType: savedRecord.anomalyType,
        severity: savedRecord.severity as AnomalySeverity,
        detectionReason: savedRecord.detectionReason,
        expectedValue: savedRecord.expectedValue,
        observedValue: savedRecord.observedValue,
        aiExplanation: savedRecord.aiExplanation,
        recommendedActions: savedRecord.recommendedActions,
      });
    }

    return {
      agreementId: agreement.id,
      anomalyCount: persistedAnomalies.length,
      anomalies: persistedAnomalies,
    };
  }
}
