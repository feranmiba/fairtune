import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { StellarModule } from '../stellar/stellar.module';
import { ReconciliationController } from './reconciliation.controller';
import { PaymentReconciliationService } from './services/payment-reconciliation.service';

@Module({
  imports: [DatabaseModule, PaymentsModule, StellarModule],
  controllers: [ReconciliationController],
  providers: [PaymentReconciliationService],
  exports: [PaymentReconciliationService],
})
export class ReconciliationModule {}
