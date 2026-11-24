import { Test, TestingModule } from '@nestjs/testing';
import { ContractAnalysisService } from './contract-analysis.service';
import { PrismaService } from '../../database/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { PdfExtractionService } from '../documents/pdf-extraction.service';
import { ContractAnalysisAgent } from '../ai/agents/contract-agent/contract-analysis.agent';
import { EmbeddingService } from '../ai/embeddings/embedding.service';
import { AnalysisStatus, DocumentStatus, RiskLevel } from '@fairtune/shared';

describe('ContractAnalysisService', () => {
  let service: ContractAnalysisService;
  let prisma: any;
  let mockDocumentsService: any;
  let mockPdfExtractionService: any;
  let mockContractAgent: any;
  let mockEmbeddingService: any;

  beforeEach(async () => {
    prisma = {
      contractAnalysis: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'analysis-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'analysis-1',
          ...data,
        })),
      },
      document: {
        update: jest.fn(),
      },
      documentChunk: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'chunk-1',
            chunkIndex: 0,
            content: 'Master recording rights clause.',
            pageNumber: 1,
          },
        ]),
      },
      contractClause: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'clause-1', ...data })),
        findMany: jest.fn(),
      },
      contractFinding: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'finding-1', ...data })),
      },
      contractComparison: {
        create: jest.fn().mockImplementation(({ data }) => ({ id: 'comp-1', ...data })),
      },
    };

    mockDocumentsService = {
      getDocumentById: jest.fn().mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        title: 'Exclusive Recording Agreement',
        extractedText:
          'Section 1. Rights Assignment. The Artist assigns all masters in perpetuity.',
        status: DocumentStatus.EXTRACTED,
      }),
      getDocumentStream: jest.fn(),
    };

    mockPdfExtractionService = {
      extract: jest.fn().mockResolvedValue({
        fullText: 'Section 1. Rights Assignment. The Artist assigns all masters in perpetuity.',
        pageCount: 1,
        pages: [{ pageNumber: 1, text: 'Text' }],
        clauses: [],
      }),
    };

    mockContractAgent = {
      execute: jest.fn().mockResolvedValue({
        summary: 'Standard high-risk recording agreement.',
        partiesInvolved: ['Artist', 'Record Label Inc'],
        overallRiskLevel: RiskLevel.HIGH,
        clauses: [
          {
            clauseTitle: 'Rights Assignment',
            category: 'RIGHTS_TRANSFER',
            extractedText: 'The Artist assigns all masters in perpetuity.',
            plainEnglishExplanation: 'You give up your master recordings forever.',
            riskLevel: RiskLevel.CRITICAL,
            riskJustification: 'Perpetual assignment denies copyright reversion.',
            suggestedCounterClause: 'Assignment limited to a 7-year term.',
            pageNumber: 1,
          },
        ],
        redFlags: ['Perpetual ownership without reversion.'],
      }),
    };

    mockEmbeddingService = {
      chunkDocument: jest
        .fn()
        .mockReturnValue([
          { index: 0, content: 'The Artist assigns all masters in perpetuity.', pageNumber: 1 },
        ]),
      generateAndStoreEmbeddings: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractAnalysisService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: PdfExtractionService, useValue: mockPdfExtractionService },
        { provide: ContractAnalysisAgent, useValue: mockContractAgent },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    service = module.get<ContractAnalysisService>(ContractAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should trigger analysis, invoke agent, and persist clauses & findings', async () => {
    const result = await service.triggerAnalysis('user-1', 'doc-1');

    expect(result).toBeDefined();
    expect(result.status).toBe(AnalysisStatus.COMPLETED);
    expect(result.overallRiskLevel).toBe(RiskLevel.HIGH);
    expect(mockContractAgent.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        documentTitle: 'Exclusive Recording Agreement',
        contractText: expect.stringContaining('Rights Assignment'),
      }),
      expect.objectContaining({ userId: 'user-1' }),
    );
    expect(prisma.contractClause.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clauseTitle: 'Rights Assignment',
          riskLevel: RiskLevel.CRITICAL,
          pageNumber: 1,
        }),
      }),
    );
    expect(prisma.contractFinding.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Critical Contract Risk Alert',
          severity: RiskLevel.HIGH,
          description: 'Perpetual ownership without reversion.',
        }),
      }),
    );
  });

  it('should compare two contracts and identify added, removed, and modified clauses with artist impact', async () => {
    mockDocumentsService.getDocumentById
      .mockResolvedValueOnce({
        id: 'doc-source',
        userId: 'user-1',
        title: 'Original Agreement v1',
      })
      .mockResolvedValueOnce({
        id: 'doc-target',
        userId: 'user-1',
        title: 'Negotiated Agreement v2',
      });

    prisma.contractClause.findMany
      .mockResolvedValueOnce([
        {
          id: 'c-1',
          category: 'RIGHTS_TRANSFER',
          clauseTitle: 'Grant of Rights v1',
          extractedText: 'Perpetual transfer of all master recordings.',
          riskLevel: RiskLevel.CRITICAL,
        },
        {
          id: 'c-2',
          category: 'EXCLUSIVITY',
          clauseTitle: 'Worldwide Exclusivity',
          extractedText: 'Exclusive throughout the universe.',
          riskLevel: RiskLevel.HIGH,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'c-1-rev',
          category: 'RIGHTS_TRANSFER',
          clauseTitle: 'Grant of Rights v2',
          extractedText: 'Exclusive license for 5 years with automatic reversion.',
          riskLevel: RiskLevel.LOW,
        },
        {
          id: 'c-3-new',
          category: 'AUDIT_RIGHTS',
          clauseTitle: 'Semi-Annual Audit Clause',
          extractedText: 'Artist may inspect books twice per calendar year.',
          riskLevel: RiskLevel.LOW,
        },
      ]);

    const comparison = await service.compareContracts('user-1', {
      sourceDocumentId: 'doc-source',
      targetDocumentId: 'doc-target',
    });

    expect(comparison).toBeDefined();
    expect(comparison.summary).toContain('Version Comparison');
    const diffs = comparison.differences as any;
    expect(diffs.addedClauses).toHaveLength(1);
    expect(diffs.addedClauses[0]).toContain('AUDIT_RIGHTS');
    expect(diffs.removedClauses).toHaveLength(1);
    expect(diffs.removedClauses[0]).toContain('EXCLUSIVITY');
    expect(diffs.modifiedClauses).toHaveLength(1);
    expect(diffs.modifiedClauses[0].impactOnArtist).toContain('Favorable');
  });
});
