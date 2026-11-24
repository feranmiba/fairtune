import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { StrKey } from '@stellar/stellar-sdk';
import { StellarNetworkService } from './stellar-network.service';

@Injectable()
export class StellarAccountService {
  private readonly logger = new Logger(StellarAccountService.name);

  constructor(private readonly networkService: StellarNetworkService) {}

  isValidPublicKey(publicKey: string): boolean {
    if (!publicKey || typeof publicKey !== 'string') return false;
    return StrKey.isValidEd25519PublicKey(publicKey);
  }

  async getAccount(publicKey: string) {
    if (!this.isValidPublicKey(publicKey)) {
      throw new BadRequestException(
        'Invalid Stellar Ed25519 public key format (must start with G)',
      );
    }

    try {
      const server = this.networkService.getServer();
      const account = await server.loadAccount(publicKey);
      return {
        accountId: account.accountId(),
        sequenceNumber: account.sequenceNumber(),
        balances: account.balances,
      };
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        throw new NotFoundException('Stellar account not found or not yet funded on network');
      }
      this.logger.error(`Failed to load Stellar account ${publicKey}: ${(error as Error).message}`);
      throw error;
    }
  }
}
