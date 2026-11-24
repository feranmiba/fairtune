import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { rpc, TransactionBuilder } from '@stellar/stellar-sdk';
import { StellarNetworkService } from './stellar-network.service';

export interface SimulationResult {
  success: boolean;
  minResourceFee?: string;
  eventsCount?: number;
  error?: string;
}

@Injectable()
export class TransactionSimulationService {
  private readonly logger = new Logger(TransactionSimulationService.name);

  constructor(private readonly networkService: StellarNetworkService) {}

  async simulateTransactionXdr(txXdr: string): Promise<SimulationResult> {
    const rpcServer = this.networkService.getRpcServer();
    const passphrase = this.networkService.getNetworkPassphrase();

    let tx;
    try {
      tx = TransactionBuilder.fromXDR(txXdr, passphrase);
    } catch {
      throw new BadRequestException('Invalid transaction XDR format');
    }

    try {
      const simRes = await rpcServer.simulateTransaction(tx);

      if (rpc.Api.isSimulationSuccess(simRes)) {
        return {
          success: true,
          minResourceFee: simRes.minResourceFee,
          eventsCount: simRes.events?.length || 0,
        };
      } else {
        const err = simRes as rpc.Api.SimulateTransactionErrorResponse;
        return {
          success: false,
          error: err.error || 'Simulation returned failure',
        };
      }
    } catch (error) {
      this.logger.error(`Error simulating transaction: ${(error as Error).message}`);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
