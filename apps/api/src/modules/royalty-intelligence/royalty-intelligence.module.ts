import { Module } from '@nestjs/common';
import { RoyaltyIntelligenceService } from './royalty-intelligence.service';
import { RoyaltyIntelligenceController } from './royalty-intelligence.controller';

@Module({
  controllers: [RoyaltyIntelligenceController],
  providers: [RoyaltyIntelligenceService],
  exports: [RoyaltyIntelligenceService],
})
export class RoyaltyIntelligenceModule {}
