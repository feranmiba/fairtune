import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { StellarNetworkService } from '../../stellar/services/stellar-network.service';
import { PaymentSyncService, RawSorobanEvent } from './payment-sync.service';

export interface MonitoringStatus {
  contractId: string | null;
  lastLedgerSequence: number;
  lastPagingToken: string | null;
  latestLedgerSequence?: number;
  rpcHealthy: boolean;
  updatedAt: string | null;
}

@Injectable()
export class StellarMonitoringService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StellarMonitoringService.name);
  private readonly contractId: string | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly networkService: StellarNetworkService,
    private readonly paymentSyncService: PaymentSyncService,
  ) {
    this.contractId = this.configService.get<string>('stellar.contractId') || null;
  }

  async onApplicationBootstrap() {
    if (this.contractId) {
      this.logger.log(`Initializing Stellar event monitoring for contract ${this.contractId}`);
      await this.getOrCreateCheckpoint();
    } else {
      this.logger.log('Stellar contract ID not configured; monitoring running in standby mode.');
    }
  }

  async getOrCreateCheckpoint() {
    if (!this.contractId) return null;

    const existing = await this.prisma.stellarMonitoringCheckpoint.findUnique({
      where: { contractAddress: this.contractId },
    });

    if (existing) return existing;

    return this.prisma.stellarMonitoringCheckpoint.create({
      data: {
        contractAddress: this.contractId,
        lastLedgerSequence: 0,
      },
    });
  }

  async getStatus(): Promise<MonitoringStatus> {
    const checkpoint = await this.getOrCreateCheckpoint();
    const server = this.networkService.getRpcServer();
    let rpcHealthy = false;
    let latestLedgerSequence: number | undefined;

    try {
      const latest = await server.getLatestLedger();
      latestLedgerSequence = latest.sequence;
      rpcHealthy = true;
    } catch (err) {
      this.logger.warn(
        `Failed to retrieve latest ledger from Soroban RPC: ${(err as Error).message}`,
      );
    }

    return {
      contractId: this.contractId,
      lastLedgerSequence: checkpoint?.lastLedgerSequence || 0,
      lastPagingToken: checkpoint?.lastPagingToken || null,
      latestLedgerSequence,
      rpcHealthy,
      updatedAt: checkpoint?.updatedAt ? checkpoint.updatedAt.toISOString() : null,
    };
  }

  /**
   * Polls for new Soroban contract events since the last checkpoint ledger.
   * Recovers from missed ledgers, updates checkpoint atomically, and processes events idempotently.
   */
  async pollEvents(limit = 100) {
    if (!this.contractId) {
      return {
        processed: 0,
        message: 'Contract ID not configured',
      };
    }

    const checkpoint = await this.getOrCreateCheckpoint();
    const server = this.networkService.getRpcServer();

    let latestLedger;
    try {
      latestLedger = await server.getLatestLedger();
    } catch (err) {
      this.logger.error(`Soroban RPC unreachable during event poll: ${(err as Error).message}`);
      return {
        processed: 0,
        error: (err as Error).message,
      };
    }

    // Determine start ledger: resume from checkpoint, or start near current ledger if first run
    let startLedger = checkpoint?.lastLedgerSequence ? checkpoint.lastLedgerSequence + 1 : 0;
    if (startLedger === 0) {
      startLedger = Math.max(1, latestLedger.sequence - 100);
    }

    if (startLedger > latestLedger.sequence) {
      return {
        processed: 0,
        message: 'Already caught up with latest ledger',
        startLedger,
        latestLedger: latestLedger.sequence,
      };
    }

    this.logger.log(
      `Polling Soroban events for ${this.contractId} from ledger ${startLedger} to ${latestLedger.sequence}`,
    );

    let getEventsRes;
    try {
      getEventsRes = await server.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [this.contractId],
          },
        ],
        limit,
      });
    } catch (err) {
      this.logger.warn(`getEvents failed for range [${startLedger}..]: ${(err as Error).message}`);
      return {
        processed: 0,
        error: (err as Error).message,
      };
    }

    const rawEvents = getEventsRes.events || [];
    let processedCount = 0;

    for (const rawEvent of rawEvents) {
      const event: RawSorobanEvent = {
        id: rawEvent.id,
        type: rawEvent.type,
        ledger: rawEvent.ledger,
        ledgerClosedAt: rawEvent.ledgerClosedAt,
        contractId: rawEvent.contractId?.toString() || this.contractId,
        topic: (rawEvent.topic as unknown[]) || [],
        value: rawEvent.value,
        txHash: rawEvent.txHash,
      };

      try {
        await this.paymentSyncService.processContractEvent(event);
        processedCount++;

        // Update checkpoint after each successfully processed event
        await this.prisma.stellarMonitoringCheckpoint.update({
          where: { contractAddress: this.contractId },
          data: {
            lastLedgerSequence: event.ledger,
            lastPagingToken: event.id,
          },
        });
      } catch (err) {
        this.logger.error(
          `Error processing event ${event.id} in tx ${event.txHash}: ${(err as Error).message}`,
        );
      }
    }

    // If no events were returned in this window, advance checkpoint up to latestLedger
    if (rawEvents.length === 0 && latestLedger.sequence >= startLedger) {
      await this.prisma.stellarMonitoringCheckpoint.update({
        where: { contractAddress: this.contractId },
        data: {
          lastLedgerSequence: latestLedger.sequence,
        },
      });
    }

    return {
      processed: processedCount,
      totalEventsFound: rawEvents.length,
      startLedger,
      latestLedger: latestLedger.sequence,
    };
  }
}
