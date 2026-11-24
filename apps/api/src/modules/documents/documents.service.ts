import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService, STORAGE_SERVICE } from './storage/storage.interface';
import { DocumentStatus } from '@fairtune/shared';
import { sanitizeFileName } from '@fairtune/shared';
import { PdfExtractionService } from './pdf-extraction.service';
import { EmbeddingService } from '../ai/embeddings/embedding.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly pdfExtractionService: PdfExtractionService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async uploadDocument(userId: string, title: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No contract file uploaded');
    }

    // Validate MIME type
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF documents are supported (.pdf)');
    }

    // Validate PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    if (file.buffer.length < 5 || file.buffer.toString('utf8', 0, 5) !== '%PDF-') {
      throw new BadRequestException('File is not a valid PDF format');
    }

    const originalFileName = sanitizeFileName(file.originalname);

    // Save to storage
    const uploadResult = await this.storageService.upload(
      file.buffer,
      originalFileName,
      file.mimetype,
    );

    // Persist document metadata with initial UPLOADED status
    const document = await this.prisma.document.create({
      data: {
        userId,
        title: title || originalFileName,
        originalFileName,
        storageKey: uploadResult.storageKey,
        mimeType: file.mimetype,
        fileSize: uploadResult.bytesWritten,
        status: DocumentStatus.UPLOADED,
      },
    });

    // Asynchronously kick off document processing lifecycle:
    // UPLOADED -> PROCESSING -> EXTRACTED -> READY
    this.processDocumentLifecycle(document.id, file.buffer).catch((err) => {
      this.logger.error(
        `Error in background processing lifecycle for document ${document.id}: ${err.message}`,
      );
    });

    return document;
  }

  async processDocumentLifecycle(documentId: string, preloadedBuffer?: Buffer): Promise<void> {
    this.logger.log(`Starting processing lifecycle for document: ${documentId}`);

    // Transition to PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PROCESSING, errorMessage: null },
    });

    try {
      const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) throw new Error(`Document ${documentId} not found`);

      const fileBuffer = preloadedBuffer || (await this.storageService.download(doc.storageKey));

      // 1. PDF Text & Clause Extraction
      const extraction = await this.pdfExtractionService.extract(fileBuffer);

      // Transition to EXTRACTED
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.EXTRACTED,
          extractedText: extraction.fullText,
          pageCount: extraction.pageCount,
        },
      });

      // 2. Clear old chunks if any and persist new segmented clauses as chunks
      await this.prisma.documentChunk.deleteMany({
        where: { documentId },
      });

      const chunksToCreate = extraction.clauses.map((clause, idx) => ({
        index: idx,
        content: `[${clause.clauseTitle}]\n${clause.content}`,
        pageNumber: clause.pageNumber,
      }));

      // If no clauses segmented, fallback to semantic chunking
      const finalChunks =
        chunksToCreate.length > 0
          ? chunksToCreate
          : this.embeddingService.chunkDocument(extraction.fullText);

      // 3. Generate and store embeddings
      await this.embeddingService.generateAndStoreEmbeddings(documentId, finalChunks);

      // Transition to READY
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.READY },
      });

      this.logger.log(
        `Document ${documentId} successfully processed: ${finalChunks.length} chunks indexed. Status: READY`,
      );
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`Document processing failed for ${documentId}: ${msg}`);
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: msg,
        },
      });
    }
  }

  async retryExtraction(userId: string, documentId: string) {
    const document = await this.getDocumentById(userId, documentId);

    // Reset status to PROCESSING and retry
    this.processDocumentLifecycle(document.id).catch((err) => {
      this.logger.error(`Error in retry lifecycle for document ${document.id}: ${err.message}`);
    });

    return {
      documentId,
      status: DocumentStatus.PROCESSING,
      message: 'Document extraction retry scheduled.',
    };
  }

  async getDocumentStatus(userId: string, documentId: string) {
    const document = await this.getDocumentById(userId, documentId);

    const chunkCount = await this.prisma.documentChunk.count({
      where: { documentId },
    });

    const embeddingCount = await this.prisma.documentEmbedding.count({
      where: { chunk: { documentId } },
    });

    return {
      documentId: document.id,
      title: document.title,
      status: document.status,
      pageCount: document.pageCount,
      fileSize: document.fileSize,
      chunkCount,
      embeddingCount,
      errorMessage: document.errorMessage,
      updatedAt: document.updatedAt,
    };
  }

  async getExtractedText(userId: string, documentId: string) {
    const document = await this.getDocumentById(userId, documentId);

    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      select: {
        id: true,
        chunkIndex: true,
        content: true,
        pageNumber: true,
        tokenCount: true,
      },
    });

    return {
      documentId: document.id,
      title: document.title,
      status: document.status,
      pageCount: document.pageCount,
      fullText: document.extractedText,
      chunkCount: chunks.length,
      chunks,
    };
  }

  async listUserDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        analysis: {
          select: {
            id: true,
            status: true,
            overallRiskLevel: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            chunks: true,
            clauses: true,
            findings: true,
          },
        },
      },
    });
  }

  async getDocumentById(userId: string, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        analysis: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this document');
    }

    return document;
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await this.getDocumentById(userId, documentId);

    try {
      await this.storageService.delete(document.storageKey);
    } catch (error) {
      this.logger.warn(
        `Could not delete storage file ${document.storageKey}: ${(error as Error).message}`,
      );
    }

    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { deleted: true, documentId };
  }

  async getDocumentStream(userId: string, documentId: string) {
    const document = await this.getDocumentById(userId, documentId);
    const stream = await this.storageService.getStream(document.storageKey);
    return {
      document,
      stream,
    };
  }
}
