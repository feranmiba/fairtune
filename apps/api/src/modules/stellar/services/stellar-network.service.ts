import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Horizon, Networks, rpc } from '@stellar/stellar-sdk';
import { StellarNetwork } from '@fairtune/shared';

@Injectable()
export class StellarNetworkService {
  private readonly logger = new Logger(StellarNetworkService.name);
  private readonly horizonServer: Horizon.Server;
  private readonly rpcServer: rpc.Server;
  private readonly networkPassphrase: string;
  private readonly rpcUrl: string;

  constructor(private readonly configService: ConfigService) {
    const horizonUrl =
      this.configService.get<string>('stellar.horizonUrl') || 'https://horizon-testnet.stellar.org';
    const network = this.configService.get<string>('stellar.network') || StellarNetwork.TESTNET;
    this.rpcUrl =
      this.configService.get<string>('stellar.rpcUrl') || 'https://soroban-testnet.stellar.org';

    this.horizonServer = new Horizon.Server(horizonUrl);
    this.rpcServer = new rpc.Server(this.rpcUrl);
    this.networkPassphrase = network === StellarNetwork.PUBLIC ? Networks.PUBLIC : Networks.TESTNET;

    this.logger.log(
      `Initialized Stellar Service for network: ${network} (${horizonUrl}) with RPC: ${this.rpcUrl}`,
    );
  }

  getServer(): Horizon.Server {
    return this.horizonServer;
  }

  getRpcServer(): rpc.Server {
    return this.rpcServer;
  }

  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }

  getRpcUrl(): string {
    return this.rpcUrl;
  }

  async checkConnectivity(): Promise<{
    connected: boolean;
    horizonVersion?: string;
    rpcHealthy?: boolean;
  }> {
    let rpcHealthy = false;
    try {
      const health = await this.rpcServer.getHealth();
      rpcHealthy = health.status === 'healthy';
    } catch (e) {
      this.logger.warn(`Soroban RPC health check failed: ${(e as Error).message}`);
    }

    try {
      const root = await this.horizonServer.root();
      return {
        connected: true,
        horizonVersion: root.horizon_version,
        rpcHealthy,
      };
    } catch (error) {
      this.logger.warn(`Stellar Horizon connectivity check failed: ${(error as Error).message}`);
      return { connected: false, rpcHealthy };
    }
  }
}
