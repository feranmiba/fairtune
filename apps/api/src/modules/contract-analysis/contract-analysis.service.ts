import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ContractAnalysisAgent } from '../ai/agents/contract-agent/contract-analysis.agent';
import { EmbeddingService } from '../ai/embeddings/embedding.service';
import { AnalysisStatus, DocumentStatus, RiskLevel, ContractFindingType } from '@fairtune/shared';
import { TriggerContractAnalysisInput, CompareContractsInput } from '@fairtune/validation';
import { DocumentsService } from '../documents/documents.service';
import { PdfExtractionService } from '../documents/pdf-extraction.service';

@Injectable()
export class ContractAnalysisService {
  private readonly logger = new Logger(ContractAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    private readonly pdfExtractionService: PdfExtractionService,
    private readonly contractAgent: ContractAnalysisAgent,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async triggerAnalysis(userId: string, documentId: string, _input?: TriggerContractAnalysisInput) {
    const document = await this.documentsService.getDocumentById(userId, documentId);

    // Upsert analysis record
    let analysis = await this.prisma.contractAnalysis.findUnique({
      where: { documentId },
    });

    if (!analysis) {
      analysis = await this.prisma.contractAnalysis.create({
        data: {
          documentId,
          userId,
          status: AnalysisStatus.PROCESSING,
        },
      });
    } else {
      analysis = await this.prisma.contractAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: AnalysisStatus.PROCESSING,
          updatedAt: new Date(),
        },
      });
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PROCESSING },
    });

    try {
      // 1. Get real extracted contract text
      let contractText = document.extractedText || '';

      if (!contractText) {
        // If not yet extracted, extract from storage
        const streamData = await this.documentsService.getDocumentStream(userId, documentId);
        const chunksBuffer: Buffer[] = [];
        for await (const chunk of streamData.stream) {
          chunksBuffer.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const fullBuffer = Buffer.concat(chunksBuffer);
        const extraction = await this.pdfExtractionService.extract(fullBuffer);
        contractText = extraction.fullText;

        await this.prisma.document.update({
          where: { id: documentId },
          data: {
            extractedText: contractText,
            pageCount: extraction.pageCount,
            status: DocumentStatus.EXTRACTED,
          },
        });
      }

      // 2. Ensure chunks and embeddings exist
      const existingChunkCount = await this.prisma.documentChunk.count({
        where: { documentId },
      });

      if (existingChunkCount === 0) {
        const chunks = this.embeddingService.chunkDocument(contractText);
        await this.embeddingService.generateAndStoreEmbeddings(documentId, chunks);
      }

      const documentChunks = await this.prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      });

      // 3. Execute Contract Analysis Agent with real contract text
      const result = await this.contractAgent.execute(
        {
          documentTitle: document.title,
          contractText: contractText.slice(0, 8000), // Analyze primary contract body
        },
        {
          userId,
          documentId,
        },
      );

      // 4. Persist individual extracted clauses with exact page references
      await this.prisma.contractClause.deleteMany({
        where: { documentId },
      });

      for (const clause of result.clauses) {
        // Find best matching chunk for page tracking
        const matchingChunk = documentChunks.find((c) =>
          c.content.toLowerCase().includes(clause.clauseTitle.toLowerCase()),
        );

        await this.prisma.contractClause.create({
          data: {
            documentId,
            chunkId: matchingChunk?.id,
            clauseTitle: clause.clauseTitle,
            category: clause.category,
            extractedText: clause.extractedText,
            explanation: clause.explanation,
            riskLevel: clause.riskLevel as RiskLevel,
            riskJustification: clause.riskJustification,
            suggestedCounterClause: clause.suggestedCounterClause,
            pageNumber: matchingChunk?.pageNumber || 1,
          },
        });
      }

      // 5. Persist red flag findings
      await this.prisma.contractFinding.deleteMany({
        where: { documentId },
      });

      for (const redFlag of result.redFlags || []) {
        await this.prisma.contractFinding.create({
          data: {
            documentId,
            findingType: ContractFindingType.UNFAVOURABLE_TERM,
            severity: RiskLevel.HIGH,
            title: 'Critical Contract Risk Alert',
            description: redFlag,
            remediation:
              'Seek independent legal review or negotiate specific revision window before signing.',
          },
        });
      }

      // 6. Update analysis record with status COMPLETED
      analysis = await this.prisma.contractAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: AnalysisStatus.COMPLETED,
          summary: result.summary,
          overallRiskLevel: result.overallRiskLevel as RiskLevel,
          analysisResult: result as unknown as object,
        },
      });

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.ANALYZED },
      });

      this.logger.log(`Contract analysis completed successfully for document: ${documentId}`);
    } catch (error) {
      this.logger.error(
        `Contract analysis failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      analysis = await this.prisma.contractAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: AnalysisStatus.FAILED,
          summary: `Analysis execution failed: ${(error as Error).message}`,
        },
      });

      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED },
      });
    }

    return analysis;
  }

  async getAnalysisById(userId: string, analysisId: string) {
    const analysis = await this.prisma.contractAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        document: {
          include: {
            clauses: {
              orderBy: { createdAt: 'asc' },
            },
            findings: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!analysis) {
      throw new NotFoundException('Contract analysis record not found');
    }

    if (analysis.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this analysis');
    }

    return analysis;
  }

  async getAnalysisByDocumentId(userId: string, documentId: string) {
    await this.documentsService.getDocumentById(userId, documentId);

    const analysis = await this.prisma.contractAnalysis.findUnique({
      where: { documentId },
      include: {
        document: {
          include: {
            clauses: {
              orderBy: { createdAt: 'asc' },
            },
            findings: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!analysis) {
      throw new NotFoundException('No analysis has been run for this document yet');
    }

    return analysis;
  }

  async compareContracts(userId: string, input: CompareContractsInput) {
    // 1. Verify ownership of both source and target documents
    const sourceDoc = await this.documentsService.getDocumentById(userId, input.sourceDocumentId);
    const targetDoc = await this.documentsService.getDocumentById(userId, input.targetDocumentId);

    // 2. Fetch clauses for both documents
    const sourceClauses = await this.prisma.contractClause.findMany({
      where: { documentId: sourceDoc.id },
    });
    const targetClauses = await this.prisma.contractClause.findMany({
      where: { documentId: targetDoc.id },
    });

    // 3. Compute diff
    const addedClauses: string[] = [];
    const removedClauses: string[] = [];
    const modifiedClauses: Array<{
      category: string;
      sourceTitle: string;
      targetTitle: string;
      impactOnArtist: string;
    }> = [];

    const targetCategories = new Set(targetClauses.map((c) => c.category));
    const sourceCategories = new Set(sourceClauses.map((c) => c.category));

    // Find removed
    for (const sc of sourceClauses) {
      if (!targetCategories.has(sc.category)) {
        removedClauses.push(`${sc.category}: ${sc.clauseTitle}`);
      }
    }

    // Find added
    for (const tc of targetClauses) {
      if (!sourceCategories.has(tc.category)) {
        addedClauses.push(`${tc.category}: ${tc.clauseTitle}`);
      }
    }

    // Find modified
    for (const sc of sourceClauses) {
      const tc = targetClauses.find((t) => t.category === sc.category);
      if (tc && sc.extractedText !== tc.extractedText) {
        modifiedClauses.push({
          category: sc.category,
          sourceTitle: sc.clauseTitle,
          targetTitle: tc.clauseTitle,
          impactOnArtist:
            tc.riskLevel === 'LOW' && sc.riskLevel !== 'LOW'
              ? 'Favorable: Revision reduces artist risk compared to original terms.'
              : tc.riskLevel === 'CRITICAL' && sc.riskLevel !== 'CRITICAL'
                ? 'Unfavorable: Revision introduces higher risk or broader rights transfer.'
                : 'Neutral/Structural: Terms updated without significant shift in risk tier.',
        });
      }
    }

    const summary = `Version Comparison between "${sourceDoc.title}" (Original) and "${targetDoc.title}" (Revised): Identified ${modifiedClauses.length} modified clauses, ${addedClauses.length} added clauses, and ${removedClauses.length} removed clauses.`;

    const differences = {
      sourceDocumentId: sourceDoc.id,
      sourceTitle: sourceDoc.title,
      targetDocumentId: targetDoc.id,
      targetTitle: targetDoc.title,
      addedClauses,
      removedClauses,
      modifiedClauses,
      comparisonFocus: input.comparisonFocus || ['ALL_CLAUSES'],
    };

    // 4. Save comparison record
    const comparison = await this.prisma.contractComparison.create({
      data: {
        userId,
        sourceDocumentId: sourceDoc.id,
        targetDocumentId: targetDoc.id,
        summary,
        differences,
      },
    });

    return comparison;
  }
}
