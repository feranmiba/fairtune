import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentAssetService } from './services/payment-asset.service';
import { PaymentsService } from './services/payments.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [PaymentAssetService, PaymentsService],
  exports: [PaymentAssetService, PaymentsService],
})
export class PaymentsModule {}
