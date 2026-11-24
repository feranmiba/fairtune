import { Module } from '@nestjs/common';
import { RightsIntelligenceService } from './rights-intelligence.service';
import { RightsIntelligenceController } from './rights-intelligence.controller';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [RightsIntelligenceController],
  providers: [RightsIntelligenceService],
  exports: [RightsIntelligenceService],
})
export class RightsIntelligenceModule {}
