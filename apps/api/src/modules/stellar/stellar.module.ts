import { Module } from '@nestjs/common';
import { StellarNetworkService } from './services/stellar-network.service';
import { StellarAccountService } from './services/stellar-account.service';
import { StellarTransactionService } from './services/stellar-transaction.service';
import { SorobanContractService } from './services/soroban-contract.service';
import { TransactionBuilderService } from './services/transaction-builder.service';
import { TransactionSimulationService } from './services/transaction-simulation.service';
import { AgreementSyncService } from './services/agreement-sync.service';
import { StellarController } from './stellar.controller';

@Module({
  controllers: [StellarController],
  providers: [
    StellarNetworkService,
    StellarAccountService,
    StellarTransactionService,
    SorobanContractService,
    TransactionBuilderService,
    TransactionSimulationService,
    AgreementSyncService,
  ],
  exports: [
    StellarNetworkService,
    StellarAccountService,
    StellarTransactionService,
    SorobanContractService,
    TransactionBuilderService,
    TransactionSimulationService,
    AgreementSyncService,
  ],
})
export class StellarModule {}
