import { Module } from '@nestjs/common';
import { ContractAnalysisService } from './contract-analysis.service';
import { ContractAnalysisController } from './contract-analysis.controller';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [ContractAnalysisController],
  providers: [ContractAnalysisService],
  exports: [ContractAnalysisService],
})
export class ContractAnalysisModule {}
