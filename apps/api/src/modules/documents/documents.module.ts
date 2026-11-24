import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { STORAGE_SERVICE } from './storage/storage.interface';
import { LocalStorageAdapter } from './storage/local-storage.adapter';
import { PdfExtractionService } from './pdf-extraction.service';

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    PdfExtractionService,
    {
      provide: STORAGE_SERVICE,
      useClass: LocalStorageAdapter,
    },
  ],
  exports: [DocumentsService, PdfExtractionService, STORAGE_SERVICE],
})
export class DocumentsModule {}
