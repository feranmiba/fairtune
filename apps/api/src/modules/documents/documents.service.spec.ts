import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_SERVICE } from './storage/storage.interface';
import { PdfExtractionService } from './pdf-extraction.service';
import { EmbeddingService } from '../ai/embeddings/embedding.service';
import { DocumentStatus } from '@fairtune/shared';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    document: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    documentChunk: {
      deleteMany: jest.Mock;
    };
  };
  let storageService: {
    upload: jest.Mock;
    delete: jest.Mock;
    getStream: jest.Mock;
  };
  let mockPdfExtractionService: any;
  let mockEmbeddingService: any;

  beforeEach(async () => {
    prisma = {
      document: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'doc-uuid-1',
          ...data,
        })),
        delete: jest.fn(),
      },
      documentChunk: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    storageService = {
      upload: jest.fn().mockResolvedValue({
        storageKey: 'test-key.pdf',
        bytesWritten: 1024,
      }),
      delete: jest.fn().mockResolvedValue(true),
      getStream: jest.fn(),
    };

    mockPdfExtractionService = {
      extract: jest.fn().mockResolvedValue({
        fullText: 'Section 1. Music Master Rights in perpetuity.',
        pageCount: 1,
        pages: [{ pageNumber: 1, text: 'Section 1. Music Master Rights in perpetuity.' }],
        clauses: [{ index: 0, clauseTitle: 'Section 1', content: 'Rights', pageNumber: 1 }],
      }),
    };

    mockEmbeddingService = {
      chunkDocument: jest
        .fn()
        .mockReturnValue([
          { index: 0, content: 'Section 1. Music Master Rights in perpetuity.', pageNumber: 1 },
        ]),
      generateAndStoreEmbeddings: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: STORAGE_SERVICE, useValue: storageService },
        { provide: PdfExtractionService, useValue: mockPdfExtractionService },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('uploadDocument', () => {
    it('should successfully upload a valid PDF file', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.7 mock pdf content');
      const mockFile = {
        buffer: validPdfBuffer,
        originalname: 'contract.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      prisma.document.create.mockResolvedValue({
        id: 'doc-uuid-1',
        userId: 'user-1',
        title: 'Publishing Agreement',
        storageKey: 'test-key.pdf',
        status: DocumentStatus.UPLOADED,
      });

      const result = await service.uploadDocument('user-1', 'Publishing Agreement', mockFile);

      expect(storageService.upload).toHaveBeenCalled();
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            mimeType: 'application/pdf',
            status: DocumentStatus.UPLOADED,
          }),
        }),
      );
      expect(result.id).toBe('doc-uuid-1');
    });

    it('should reject files with invalid MIME types', async () => {
      const mockFile = {
        buffer: Buffer.from('plain text'),
        originalname: 'contract.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      await expect(service.uploadDocument('user-1', 'Invalid Contract', mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject files missing the PDF magic header', async () => {
      const mockFile = {
        buffer: Buffer.from('NOT_A_PDF_CONTENT'),
        originalname: 'fake.pdf',
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      await expect(service.uploadDocument('user-1', 'Fake PDF', mockFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Document Ownership Enforcement', () => {
    it('should throw NotFoundException if document does not exist', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getDocumentById('user-1', 'nonexistent-doc')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not the document owner', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        userId: 'owner-user-id',
        title: 'Secret Contract',
      });

      await expect(service.getDocumentById('attacker-user-id', 'doc-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow owner to access their document', async () => {
      const mockDoc = {
        id: 'doc-1',
        userId: 'owner-user-id',
        title: 'Secret Contract',
      };
      prisma.document.findUnique.mockResolvedValue(mockDoc);

      const result = await service.getDocumentById('owner-user-id', 'doc-1');
      expect(result).toEqual(mockDoc);
    });
  });
});
