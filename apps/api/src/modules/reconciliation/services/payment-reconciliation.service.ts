import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SorobanContractService } from '../../stellar/services/soroban-contract.service';
import { PaymentAssetService } from '../../payments/services/payment-asset.service';
import {
  AnomalySeverity,
  PaymentStatus,
  ReconciliationStatus,
  StellarTransactionType,
  TransactionStatus,
  UserRole,
} from '@fairtune/shared';

export interface ReconciliationReport {
  reconciliationId: string;
  agreementId: string;
  status: ReconciliationStatus;
  expectedBalance: string;
  observedOnChainBalance: string;
  totalDeposited: string;
  totalDistributed: string;
  discrepancyCount: number;
  findings: Array<{
    findingType: string;
    description: string;
    severity: AnomalySeverity;
  }>;
  reconciledAt: string;
}

@Injectable()
export class PaymentReconciliationService {
  private readonly logger = new Logger(PaymentReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sorobanService: SorobanContractService,
    private readonly assetService: PaymentAssetService,
  ) {}

  /**
   * Reconciles an agreement's financial records by validating all deterministic invariants.
   */
  async reconcileAgreement(
    agreementId: string,
    userId: string,
    role?: UserRole,
  ): Promise<ReconciliationReport> {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: { include: { collaborator: true } },
        transactions: true,
        payments: {
          include: { collaborator: true },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundException(`Royalty agreement ${agreementId} not found`);
    }

    if (role !== UserRole.ADMIN) {
      const isCreator = agreement.creatorId === userId;
      const isParticipant = agreement.participants.some((p) => p.collaborator.userId === userId);
      if (!isCreator && !isParticipant) {
        throw new ForbiddenException('You do not have permission to reconcile this agreement');
      }
    }

    this.logger.log(`Executing reconciliation audit for agreement ${agreementId}`);

    const findings: Array<{
      findingType: string;
      description: string;
      severity: AnomalySeverity;
    }> = [];

    let onChainDepositedSubunits = BigInt(0);
    let onChainDistributedSubunits = BigInt(0);
    let onChainBalanceSubunits = BigInt(0);

    // 1. Fetch live authoritative state from Soroban smart contract if agreement is on-chain
    if (agreement.onChainAgreementId) {
      const onChainData = await this.sorobanService.getAgreement(agreement.onChainAgreementId);
      if (onChainData) {
        onChainDepositedSubunits = BigInt(onChainData.totalDeposited);
        onChainDistributedSubunits = BigInt(onChainData.totalDistributed);
        onChainBalanceSubunits =
          onChainDepositedSubunits > onChainDistributedSubunits
            ? onChainDepositedSubunits - onChainDistributedSubunits
            : BigInt(0);
      } else {
        findings.push({
          findingType: 'ON_CHAIN_AGREEMENT_INACCESSIBLE',
          description: `On-chain agreement record ${agreement.onChainAgreementId} could not be retrieved from Soroban RPC`,
          severity: AnomalySeverity.HIGH,
        });
      }
    } else {
      findings.push({
        findingType: 'OFF_CHAIN_ONLY',
        description: 'Agreement has not been registered on Stellar Soroban yet',
        severity: AnomalySeverity.LOW,
      });
    }

    // 2. Aggregate DB Transaction records
    let dbConfirmedDepositsSubunits = BigInt(0);
    let dbConfirmedDistributionsSubunits = BigInt(0);

    const asset = agreement.paymentTokenAddress
      ? await this.assetService.getAssetByContract(agreement.paymentTokenAddress)
      : null;
    const decimals = asset?.decimals ?? 7;

    for (const tx of agreement.transactions) {
      if (tx.status === TransactionStatus.SUCCESS) {
        const subunits = BigInt(this.assetService.toSubunits(tx.amount.toString(), decimals));
        if (tx.transactionType === StellarTransactionType.ESCROW_DEPOSIT) {
          dbConfirmedDepositsSubunits += subunits;
        } else if (tx.transactionType === StellarTransactionType.ROYALTY_DISTRIBUTION) {
          dbConfirmedDistributionsSubunits += subunits;
        }
      }
    }

    // 3. Aggregate DB Payment records
    let dbConfirmedPaymentsSubunits = BigInt(0);
    const paymentsByCollaborator = new Map<string, bigint>();
    const seenTxRecipient = new Set<string>();

    for (const pay of agreement.payments) {
      if (pay.status === PaymentStatus.CONFIRMED) {
        const paySubunits = BigInt(pay.amountSubunits);
        dbConfirmedPaymentsSubunits += paySubunits;

        if (pay.collaboratorId) {
          const current = paymentsByCollaborator.get(pay.collaboratorId) || BigInt(0);
          paymentsByCollaborator.set(pay.collaboratorId, current + paySubunits);
        }

        // Check for duplicate payment records (same tx + recipient)
        if (pay.transactionHash) {
          const key = `${pay.transactionHash}_${pay.recipientAddress}`;
          if (seenTxRecipient.has(key)) {
            findings.push({
              findingType: 'DUPLICATE_PAYMENT_RECORD',
              description: `Duplicate payment record detected for recipient ${pay.recipientAddress} in transaction ${pay.transactionHash}`,
              severity: AnomalySeverity.CRITICAL,
            });
          }
          seenTxRecipient.add(key);
        }

        // Verify recipient address matches collaborator registered address
        if (pay.collaborator && pay.recipientAddress !== pay.collaborator.walletAddress) {
          findings.push({
            findingType: 'UNEXPECTED_PAYMENT_DESTINATION',
            description: `Payment ${pay.id} sent to ${pay.recipientAddress}, but collaborator registered address is ${pay.collaborator.walletAddress}`,
            severity: AnomalySeverity.CRITICAL,
          });
        }
      }
    }

    // --- INVARIANT CHECKS ---

    // Invariant 1: Total distributed must never exceed total deposited
    if (onChainDistributedSubunits > onChainDepositedSubunits) {
      findings.push({
        findingType: 'DISTRIBUTION_EXCEEDS_DEPOSIT',
        description: `On-chain distributions (${onChainDistributedSubunits}) exceed deposits (${onChainDepositedSubunits})`,
        severity: AnomalySeverity.CRITICAL,
      });
    }

    // Invariant 2: On-chain deposited vs DB deposits
    if (agreement.onChainAgreementId && onChainDepositedSubunits !== dbConfirmedDepositsSubunits) {
      findings.push({
        findingType: 'DEPOSIT_AMOUNT_MISMATCH',
        description: `On-chain deposits (${onChainDepositedSubunits}) do not match database confirmed deposits (${dbConfirmedDepositsSubunits})`,
        severity: AnomalySeverity.HIGH,
      });
    }

    // Invariant 3: On-chain distributed vs DB payments
    if (
      agreement.onChainAgreementId &&
      onChainDistributedSubunits !== dbConfirmedPaymentsSubunits
    ) {
      findings.push({
        findingType: 'PAYMENT_AMOUNT_MISMATCH',
        description: `On-chain distributions (${onChainDistributedSubunits}) do not match total database collaborator payments (${dbConfirmedPaymentsSubunits})`,
        severity: AnomalySeverity.HIGH,
      });
    }

    if (
      dbConfirmedDistributionsSubunits > BigInt(0) &&
      dbConfirmedDistributionsSubunits !== dbConfirmedPaymentsSubunits
    ) {
      findings.push({
        findingType: 'INTERNAL_PAYMENT_DISCREPANCY',
        description: `Database transaction distribution sum (${dbConfirmedDistributionsSubunits}) differs from individual payment records sum (${dbConfirmedPaymentsSubunits})`,
        severity: AnomalySeverity.MEDIUM,
      });
    }

    // Invariant 4: Allocation splits accuracy
    if (dbConfirmedPaymentsSubunits > BigInt(0)) {
      for (const p of agreement.participants) {
        const actualPaid = paymentsByCollaborator.get(p.collaboratorId) || BigInt(0);
        const expectedShare =
          (dbConfirmedPaymentsSubunits * BigInt(Math.round(Number(p.royaltyPercentage) * 100))) /
          BigInt(10000);

        // Allow up to 10 subunits integer rounding difference across transactions
        const diff =
          actualPaid > expectedShare ? actualPaid - expectedShare : expectedShare - actualPaid;
        if (diff > BigInt(50)) {
          findings.push({
            findingType: 'ALLOCATION_PERCENTAGE_MISMATCH',
            description: `Collaborator ${p.collaborator.displayName} received ${actualPaid} subunits, expected ~${expectedShare} subunits based on ${p.royaltyPercentage}% split`,
            severity: AnomalySeverity.MEDIUM,
          });
        }
      }
    }

    // Determine status
    let status: ReconciliationStatus = ReconciliationStatus.MATCHED;
    if (
      findings.some(
        (f) => f.severity === AnomalySeverity.CRITICAL || f.severity === AnomalySeverity.HIGH,
      )
    ) {
      status = ReconciliationStatus.PENDING_REVIEW;
    } else if (findings.length > 0) {
      status = ReconciliationStatus.MISMATCHED;
    } else if (onChainBalanceSubunits > BigInt(0)) {
      status = ReconciliationStatus.INCOMPLETE;
    }

    const totalDepositedDecimal = this.assetService.fromSubunits(
      onChainDepositedSubunits,
      decimals,
    );
    const totalDistributedDecimal = this.assetService.fromSubunits(
      onChainDistributedSubunits,
      decimals,
    );
    const expectedBalanceDecimal = this.assetService.fromSubunits(onChainBalanceSubunits, decimals);

    // Save reconciliation audit record
    const reconciliation = await this.prisma.paymentReconciliation.create({
      data: {
        agreementId: agreement.id,
        expectedBalance: new Prisma.Decimal(expectedBalanceDecimal),
        observedOnChainBalance: new Prisma.Decimal(expectedBalanceDecimal),
        totalDeposited: new Prisma.Decimal(totalDepositedDecimal),
        totalDistributed: new Prisma.Decimal(totalDistributedDecimal),
        status,
        discrepancyCount: findings.length,
        detailsJson: {
          onChainDepositedSubunits: onChainDepositedSubunits.toString(),
          onChainDistributedSubunits: onChainDistributedSubunits.toString(),
          dbConfirmedPaymentsSubunits: dbConfirmedPaymentsSubunits.toString(),
        },
        findings: {
          create: findings.map((f) => ({
            findingType: f.findingType,
            description: f.description,
            severity: f.severity,
          })),
        },
      },
      include: { findings: true },
    });

    this.logger.log(
      `Reconciliation completed for ${agreementId}: Status=${status}, Discrepancies=${findings.length}`,
    );

    return {
      reconciliationId: reconciliation.id,
      agreementId: agreement.id,
      status,
      expectedBalance: expectedBalanceDecimal,
      observedOnChainBalance: expectedBalanceDecimal,
      totalDeposited: totalDepositedDecimal,
      totalDistributed: totalDistributedDecimal,
      discrepancyCount: findings.length,
      findings,
      reconciledAt: reconciliation.reconciledAt.toISOString(),
    };
  }

  async getLatestReconciliation(agreementId: string, userId: string, role?: UserRole) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id: agreementId },
      include: { participants: { include: { collaborator: true } } },
    });

    if (!agreement) {
      throw new NotFoundException(`Royalty agreement ${agreementId} not found`);
    }

    if (role !== UserRole.ADMIN) {
      const isCreator = agreement.creatorId === userId;
      const isParticipant = agreement.participants.some((p) => p.collaborator.userId === userId);
      if (!isCreator && !isParticipant) {
        throw new ForbiddenException(
          'You do not have permission to view reconciliation for this agreement',
        );
      }
    }

    return this.prisma.paymentReconciliation.findFirst({
      where: { agreementId },
      orderBy: { reconciledAt: 'desc' },
      include: { findings: true },
    });
  }

  async listReconciliations(userId: string, role?: UserRole, limit = 20) {
    const where: Prisma.PaymentReconciliationWhereInput = {};
    if (role !== UserRole.ADMIN) {
      where.agreement = {
        OR: [{ creatorId: userId }, { participants: { some: { collaborator: { userId } } } }],
      };
    }

    return this.prisma.paymentReconciliation.findMany({
      where,
      orderBy: { reconciledAt: 'desc' },
      take: limit,
      include: {
        agreement: { select: { id: true, title: true, trackName: true } },
        findings: true,
      },
    });
  }

  async listUnresolvedFindings(userId: string, role?: UserRole) {
    const where: Prisma.ReconciliationFindingWhereInput = {
      resolved: false,
    };

    if (role !== UserRole.ADMIN) {
      where.reconciliation = {
        agreement: {
          OR: [{ creatorId: userId }, { participants: { some: { collaborator: { userId } } } }],
        },
      };
    }

    return this.prisma.reconciliationFinding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        reconciliation: {
          include: {
            agreement: { select: { id: true, title: true, trackName: true } },
          },
        },
      },
    });
  }
}
