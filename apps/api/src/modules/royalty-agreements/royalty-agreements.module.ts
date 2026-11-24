import { Module } from '@nestjs/common';
import { RoyaltyAgreementsService } from './royalty-agreements.service';
import { RoyaltyAgreementsController } from './royalty-agreements.controller';
import { CollaboratorsModule } from '../collaborators/collaborators.module';

@Module({
  imports: [CollaboratorsModule],
  controllers: [RoyaltyAgreementsController],
  providers: [RoyaltyAgreementsService],
  exports: [RoyaltyAgreementsService],
})
export class RoyaltyAgreementsModule {}
