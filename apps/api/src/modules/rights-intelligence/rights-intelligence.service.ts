import { Injectable } from '@nestjs/common';
import { RightsIntelligenceAgent } from '../ai/agents/rights-agent/rights-intelligence.agent';
import { DocumentsService } from '../documents/documents.service';
import { RightsExtractionResult } from '@fairtune/shared';

@Injectable()
export class RightsIntelligenceService {
  constructor(
    private readonly rightsAgent: RightsIntelligenceAgent,
    private readonly documentsService: DocumentsService,
  ) {}

  async extractRightsMetadata(userId: string, documentId: string): Promise<RightsExtractionResult> {
    const document = await this.documentsService.getDocumentById(userId, documentId);

    const mockContractText = `Agreement regarding work "${document.title}" (Original file: ${document.originalFileName}). Master ownership assigned to Publisher. Co-writers John Doe (50%) and Jane Smith (50%).`;

    return this.rightsAgent.execute(
      {
        documentId,
        contractText: mockContractText,
      },
      {
        userId,
        documentId,
      },
    );
  }
}
