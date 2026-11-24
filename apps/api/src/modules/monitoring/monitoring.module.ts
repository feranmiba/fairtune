import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PaymentsModule } from '../payments/payments.module';
import { StellarModule } from '../stellar/stellar.module';
import { MonitoringController } from './monitoring.controller';
import { StellarMonitoringService } from './services/stellar-monitoring.service';
import { PaymentSyncService } from './services/payment-sync.service';

@Module({
  imports: [DatabaseModule, PaymentsModule, StellarModule],
  controllers: [MonitoringController],
  providers: [StellarMonitoringService, PaymentSyncService],
  exports: [StellarMonitoringService, PaymentSyncService],
})
export class MonitoringModule {}
