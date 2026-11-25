import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionBuilder } from '@stellar/stellar-sdk';
import { PrismaService } from '../../../database/prisma.service';
import { StellarNetworkService } from './stellar-network.service';
import { SorobanContractService } from './soroban-contract.service';
import {
  AgreementStatus,
  ApprovalStatus,
  StellarTransactionType,
  TransactionStatus,
} from '@fairtune/shared';

@Injectable()
export class AgreementSyncService {
  private readonly logger = new Logger(AgreementSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly networkService: StellarNetworkService,
    private readonly sorobanContractService: SorobanContractService,
  ) {}

  /**
   * Submits a signed transaction XDR to Stellar via Soroban RPC and waits for ledger confirmation.
   */
  async submitSignedTransaction(signedTxXdr: string) {
    const rpcServer = this.networkService.getRpcServer();
    const passphrase = this.networkService.getNetworkPassphrase();

    let tx;
    try {
      tx = TransactionBuilder.fromXDR(signedTxXdr, passphrase);
    } catch {
      throw new BadRequestException('Invalid signed transaction XDR');
    }

    const txHash = tx.hash().toString('hex');
    this.logger.log(`Submitting signed transaction: ${txHash}`);

    const sendRes = await rpcServer.sendTransaction(tx);

    if (sendRes.status === 'ERROR') {
      this.logger.error(`SendTransaction rejected: ${JSON.stringify(sendRes)}`);
      throw new BadRequestException(
        `Transaction submission failed: ${sendRes.errorResult?.toString() || JSON.stringify(sendRes)}`,
      );
    }

    // Poll for status confirmation via direct JSON-RPC to avoid SDK union parser mismatches
    let getTxRes: any = null;
    let attempts = 0;
    while (attempts < 15) {
      try {
        const rawRes = await fetch(this.networkService.getRpcUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: { hash: txHash },
          }),
        });
        const json = await rawRes.json() as any;
        getTxRes = json.result;
        if (getTxRes && getTxRes.status !== 'NOT_FOUND') {
          break;
        }
      } catch (err) {
        this.logger.warn(`Polling status warning: ${err}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      attempts++;
    }

    const isSuccess = getTxRes?.status === 'SUCCESS';
    const status = isSuccess ? TransactionStatus.SUCCESS : TransactionStatus.FAILED;

    return {
      hash: txHash,
      status,
      ledger: getTxRes?.ledger || getTxRes?.latestLedger,
      createdAt: new Date().toISOString(),
      rawResult: getTxRes,
    };
  }

  /**
   * Synchronizes an agreement's on-chain Soroban state with the local database.
   */
  async syncAgreementFromChain(agreementId: string) {
    const agreement = await this.prisma.royaltyAgreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: {
          include: { collaborator: true },
        },
      },
    });

    if (!agreement) {
      throw new NotFoundException(`Royalty agreement ${agreementId} not found`);
    }

    if (!agreement.onChainAgreementId) {
      return {
        agreementId,
        synced: false,
        message: 'Agreement has not yet been registered on-chain',
      };
    }

    const onChainData = await this.sorobanContractService.getAgreement(
      agreement.onChainAgreementId,
    );
    if (!onChainData) {
      return {
        agreementId,
        synced: false,
        message: 'On-chain agreement record not found or inaccessible',
      };
    }

    // Map on-chain status to Prisma agreement status
    let mappedStatus = agreement.status;
    if (onChainData.status === 'ACTIVE' || onChainData.status === 'FUNDED') {
      mappedStatus = AgreementStatus.ACTIVE;
    } else if (onChainData.status === 'CANCELLED') {
      mappedStatus = AgreementStatus.TERMINATED;
    }

    // Update participant on-chain approvals
    const approvalSet = new Set(onChainData.approvals);
    for (const p of agreement.participants) {
      const isApprovedOnChain = approvalSet.has(p.collaborator.walletAddress);
      if (isApprovedOnChain && !p.onChainApproved) {
        await this.prisma.agreementParticipant.update({
          where: { id: p.id },
          data: {
            onChainApproved: true,
            approvalStatus: ApprovalStatus.APPROVED,
            approvedAt: p.approvedAt || new Date(),
          },
        });
      }
    }

    // Update agreement sync timestamps and on-chain status
    const updated = await this.prisma.royaltyAgreement.update({
      where: { id: agreementId },
      data: {
        status: mappedStatus,
        onChainStatus: onChainData.status,
        lastSyncedAt: new Date(),
      },
      include: {
        participants: {
          include: { collaborator: true },
        },
      },
    });

    return {
      agreementId,
      synced: true,
      onChainStatus: onChainData.status,
      totalDeposited: onChainData.totalDeposited,
      totalDistributed: onChainData.totalDistributed,
      agreement: updated,
    };
  }

  /**
   * Idempotently records an on-chain transaction for an agreement.
   */
  async recordTransaction(params: {
    agreementId: string;
    transactionHash: string;
    transactionType: StellarTransactionType;
    assetCode?: string;
    amount?: number | string;
    unsignedXdr?: string;
    ledgerSequence?: number;
    status?: TransactionStatus;
  }) {
    const amountDecimal = new Prisma.Decimal(params.amount ? String(params.amount) : '0');

    return this.prisma.transaction.upsert({
      where: { transactionHash: params.transactionHash },
      create: {
        agreementId: params.agreementId,
        transactionHash: params.transactionHash,
        transactionType: params.transactionType,
        assetCode: params.assetCode || 'XLM',
        amount: amountDecimal,
        status: params.status || TransactionStatus.PENDING,
        ledgerSequence: params.ledgerSequence,
        unsignedXdr: params.unsignedXdr,
      },
      update: {
        status: params.status || TransactionStatus.PENDING,
        ledgerSequence: params.ledgerSequence,
      },
    });
  }
}
