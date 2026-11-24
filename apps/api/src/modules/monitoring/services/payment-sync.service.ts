import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PaymentsService } from '../../payments/services/payments.service';
import { PaymentAssetService } from '../../payments/services/payment-asset.service';
import { AgreementSyncService } from '../../stellar/services/agreement-sync.service';
import { NotificationService } from '../../notifications/services/notifications.service';
import {
  AgreementStatus,
  ApprovalStatus,
  NotificationType,
  PaymentStatus,
  StellarTransactionType,
  TransactionStatus,
} from '@fairtune/shared';
import { scValToNative, xdr } from '@stellar/stellar-sdk';

export interface RawSorobanEvent {
  id: string;
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  topic: unknown[];
  value: unknown;
  txHash: string;
}

@Injectable()
export class PaymentSyncService {
  private readonly logger = new Logger(PaymentSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly assetService: PaymentAssetService,
    private readonly agreementSyncService: AgreementSyncService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Safely decodes an ScVal (whether raw object, base64 string, or pre-parsed).
   */
  parseScVal(val: unknown): unknown {
    if (!val) return null;
    if (typeof val === 'string') {
      try {
        return scValToNative(xdr.ScVal.fromXDR(val, 'base64'));
      } catch {
        return val;
      }
    }
    try {
      return scValToNative(val as xdr.ScVal);
    } catch {
      return val;
    }
  }

  /**
   * Dispatches and processes a single confirmed Soroban contract event.
   */
  async processContractEvent(event: RawSorobanEvent): Promise<boolean> {
    if (!event.topic || !Array.isArray(event.topic) || event.topic.length < 2) {
      return false;
    }

    const domain = String(this.parseScVal(event.topic[0]));
    const action = String(this.parseScVal(event.topic[1]));
    const onChainAgreementId =
      event.topic[2] !== undefined ? String(this.parseScVal(event.topic[2])) : null;

    this.logger.log(
      `Processing Soroban Event: [${domain}:${action}] Agreement: ${onChainAgreementId} Tx: ${event.txHash} (Ledger ${event.ledger})`,
    );

    if (domain === 'agree') {
      if (action === 'approved' && onChainAgreementId) {
        return this.handleAgreementApproved(onChainAgreementId, event);
      } else if (action === 'active' && onChainAgreementId) {
        return this.handleAgreementActivated(onChainAgreementId, event);
      } else if (action === 'cancel' && onChainAgreementId) {
        return this.handleAgreementCancelled(onChainAgreementId, event);
      }
    } else if (domain === 'escrow') {
      if (action === 'deposit' && onChainAgreementId) {
        return this.handleEscrowDeposited(onChainAgreementId, event);
      }
    } else if (domain === 'royalty') {
      if (action === 'distrib' && onChainAgreementId) {
        return this.handleRoyaltiesDistributed(onChainAgreementId, event);
      }
    }

    return false;
  }

  private async handleAgreementApproved(
    onChainAgreementId: string,
    event: RawSorobanEvent,
  ): Promise<boolean> {
    const collaboratorAddress = String(this.parseScVal(event.value));
    const agreement = await this.prisma.royaltyAgreement.findFirst({
      where: { onChainAgreementId },
      include: {
        participants: { include: { collaborator: true } },
      },
    });

    if (!agreement) return false;

    const participant = agreement.participants.find(
      (p) => p.collaborator.walletAddress === collaboratorAddress,
    );

    if (participant) {
      await this.prisma.agreementParticipant.update({
        where: { id: participant.id },
        data: {
          onChainApproved: true,
          approvalStatus: ApprovalStatus.APPROVED,
          onChainTxHash: event.txHash,
          approvedAt: participant.approvedAt || new Date(),
        },
      });
      this.logger.log(
        `Confirmed on-chain approval for collaborator ${collaboratorAddress} on agreement ${agreement.id}`,
      );
      return true;
    }

    return false;
  }

  private async handleAgreementActivated(
    onChainAgreementId: string,
    event: RawSorobanEvent,
  ): Promise<boolean> {
    const agreement = await this.prisma.royaltyAgreement.findFirst({
      where: { onChainAgreementId },
    });

    if (!agreement) return false;

    await this.prisma.royaltyAgreement.update({
      where: { id: agreement.id },
      data: {
        status: AgreementStatus.ACTIVE,
        onChainStatus: 'ACTIVE',
        lastSyncedLedger: event.ledger,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `Agreement ${agreement.id} transitioned to ACTIVE on-chain (Ledger ${event.ledger})`,
    );
    return true;
  }

  private async handleEscrowDeposited(
    onChainAgreementId: string,
    event: RawSorobanEvent,
  ): Promise<boolean> {
    const agreement = await this.prisma.royaltyAgreement.findFirst({
      where: { onChainAgreementId },
    });

    if (!agreement) return false;

    const parsedVal = this.parseScVal(event.value);
    let amountSubunits = '0';
    if (Array.isArray(parsedVal) && parsedVal.length >= 2) {
      amountSubunits = String(parsedVal[1]);
    } else if (
      typeof parsedVal === 'bigint' ||
      typeof parsedVal === 'number' ||
      typeof parsedVal === 'string'
    ) {
      amountSubunits = String(parsedVal);
    }

    const asset = agreement.paymentTokenAddress
      ? await this.assetService.getAssetByContract(agreement.paymentTokenAddress)
      : null;
    const decimals = asset?.decimals ?? 7;
    const amountDecimal = this.assetService.fromSubunits(amountSubunits, decimals);

    await this.agreementSyncService.recordTransaction({
      agreementId: agreement.id,
      transactionHash: event.txHash,
      transactionType: StellarTransactionType.ESCROW_DEPOSIT,
      amount: amountDecimal,
      assetCode: asset?.code || 'XLM',
      ledgerSequence: event.ledger,
      status: TransactionStatus.SUCCESS,
    });

    await this.prisma.royaltyAgreement.update({
      where: { id: agreement.id },
      data: {
        status: AgreementStatus.ACTIVE,
        onChainStatus: 'FUNDED',
        lastSyncedLedger: event.ledger,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `Recorded confirmed escrow deposit of ${amountDecimal} for agreement ${agreement.id}`,
    );

    await this.notificationService.createNotification({
      userId: agreement.creatorId,
      title: 'Escrow Deposit Confirmed',
      message: `A deposit of ${amountDecimal} ${asset?.code || 'tokens'} was confirmed in escrow for "${agreement.trackName}".`,
      type: NotificationType.DEPOSIT_CONFIRMED,
      metadata: { agreementId: agreement.id, transactionHash: event.txHash, amount: amountDecimal },
    });

    return true;
  }

  private async handleRoyaltiesDistributed(
    onChainAgreementId: string,
    event: RawSorobanEvent,
  ): Promise<boolean> {
    const agreement = await this.prisma.royaltyAgreement.findFirst({
      where: { onChainAgreementId },
      include: {
        creator: true,
        participants: { include: { collaborator: true } },
      },
    });

    if (!agreement) return false;

    const parsedVal = this.parseScVal(event.value);
    let totalDistributedSubunits = BigInt(0);
    let remainderSubunits = BigInt(0);

    if (Array.isArray(parsedVal) && parsedVal.length >= 2) {
      totalDistributedSubunits = BigInt(String(parsedVal[0]));
      remainderSubunits = BigInt(String(parsedVal[1]));
    } else if (parsedVal) {
      totalDistributedSubunits = BigInt(String(parsedVal));
    }

    if (totalDistributedSubunits <= BigInt(0)) {
      return false;
    }

    // Resolve payment asset or fallback
    let asset = agreement.paymentTokenAddress
      ? await this.assetService.getAssetByContract(agreement.paymentTokenAddress)
      : null;

    if (!asset) {
      const defaultAssets = await this.assetService.listAssets();
      asset = defaultAssets[0] || null;
    }

    const assetId = asset?.id || 'default-asset';
    const decimals = asset?.decimals ?? 7;

    // Distribute to each collaborator based on their basis points
    for (const participant of agreement.participants) {
      const basisPoints = Math.round(Number(participant.royaltyPercentage) * 100);
      const participantSubunits = (totalDistributedSubunits * BigInt(basisPoints)) / BigInt(10000);

      if (participantSubunits > BigInt(0)) {
        const amountDecimal = this.assetService.fromSubunits(participantSubunits, decimals);
        await this.paymentsService.recordPayment({
          agreementId: agreement.id,
          collaboratorId: participant.collaboratorId,
          recipientAddress: participant.collaborator.walletAddress,
          amount: amountDecimal,
          amountSubunits: participantSubunits.toString(),
          assetId,
          transactionHash: event.txHash,
          status: PaymentStatus.CONFIRMED,
          ledgerSequence: event.ledger,
        });
      }
    }

    // Remainder dust assigned to agreement creator
    if (remainderSubunits > BigInt(0)) {
      const creatorCollaborator = await this.prisma.collaborator.findFirst({
        where: { userId: agreement.creatorId },
      });
      const creatorAddress = creatorCollaborator?.walletAddress || 'GCREATOR_REMAINDER';
      const remainderDecimal = this.assetService.fromSubunits(remainderSubunits, decimals);

      await this.paymentsService.recordPayment({
        agreementId: agreement.id,
        collaboratorId: creatorCollaborator?.id || null,
        recipientAddress: creatorAddress,
        amount: remainderDecimal,
        amountSubunits: remainderSubunits.toString(),
        assetId,
        transactionHash: event.txHash,
        status: PaymentStatus.CONFIRMED,
        ledgerSequence: event.ledger,
      });
    }

    // Record ledger transaction
    const totalDecimal = this.assetService.fromSubunits(totalDistributedSubunits, decimals);
    await this.agreementSyncService.recordTransaction({
      agreementId: agreement.id,
      transactionHash: event.txHash,
      transactionType: StellarTransactionType.ROYALTY_DISTRIBUTION,
      amount: totalDecimal,
      assetCode: asset?.code || 'XLM',
      ledgerSequence: event.ledger,
      status: TransactionStatus.SUCCESS,
    });

    await this.prisma.royaltyAgreement.update({
      where: { id: agreement.id },
      data: {
        onChainStatus: 'ACTIVE',
        lastSyncedLedger: event.ledger,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `Synchronized confirmed royalty distribution of ${totalDecimal} for agreement ${agreement.id} across ${agreement.participants.length} collaborators`,
    );

    // Notify creator
    await this.notificationService.createNotification({
      userId: agreement.creatorId,
      title: 'Royalty Distribution Completed',
      message: `A distribution of ${totalDecimal} ${asset?.code || 'tokens'} was executed on-chain for "${agreement.trackName}".`,
      type: NotificationType.DISTRIBUTION_COMPLETED,
      metadata: {
        agreementId: agreement.id,
        transactionHash: event.txHash,
        totalDistributed: totalDecimal,
      },
    });

    // Notify individual collaborators with registered accounts
    for (const participant of agreement.participants) {
      if (participant.collaborator.userId) {
        await this.notificationService.createNotification({
          userId: participant.collaborator.userId,
          title: 'Royalty Payment Received',
          message: `You received a royalty payout for "${agreement.trackName}"!`,
          type: NotificationType.PAYMENT_RECEIVED,
          metadata: { agreementId: agreement.id, transactionHash: event.txHash },
        });
      }
    }

    return true;
  }

  private async handleAgreementCancelled(
    onChainAgreementId: string,
    event: RawSorobanEvent,
  ): Promise<boolean> {
    const agreement = await this.prisma.royaltyAgreement.findFirst({
      where: { onChainAgreementId },
    });

    if (!agreement) return false;

    await this.prisma.royaltyAgreement.update({
      where: { id: agreement.id },
      data: {
        status: AgreementStatus.TERMINATED,
        onChainStatus: 'CANCELLED',
        lastSyncedLedger: event.ledger,
        lastSyncedAt: new Date(),
      },
    });

    await this.agreementSyncService.recordTransaction({
      agreementId: agreement.id,
      transactionHash: event.txHash,
      transactionType: StellarTransactionType.AGREEMENT_CANCELLATION,
      amount: '0',
      ledgerSequence: event.ledger,
      status: TransactionStatus.SUCCESS,
    });

    this.logger.log(`Agreement ${agreement.id} marked CANCELLED/TERMINATED via on-chain event`);
    return true;
  }
}
