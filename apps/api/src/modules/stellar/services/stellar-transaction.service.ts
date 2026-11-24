import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { StellarNetworkService } from './stellar-network.service';

@Injectable()
export class StellarTransactionService {
  private readonly logger = new Logger(StellarTransactionService.name);

  constructor(private readonly networkService: StellarNetworkService) {}

  async verifyTransaction(txHash: string) {
    if (!txHash || !/^[0-9a-fA-F]{64}$/.test(txHash)) {
      throw new BadRequestException('Transaction hash must be a 64-character hex string');
    }

    try {
      const server = this.networkService.getServer();
      const tx = await server.transactions().transaction(txHash).call();

      return {
        successful: tx.successful,
        hash: tx.hash,
        ledger: tx.ledger_attr,
        createdAt: tx.created_at,
        sourceAccount: tx.source_account,
        feeCharged: tx.fee_charged,
        memo: tx.memo,
      };
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        throw new NotFoundException('Transaction hash not found on the Stellar ledger');
      }
      this.logger.error(
        `Error verifying Stellar transaction ${txHash}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
