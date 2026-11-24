import { Test, TestingModule } from '@nestjs/testing';
import { PdfExtractionService } from './pdf-extraction.service';

describe('PdfExtractionService', () => {
  let service: PdfExtractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfExtractionService],
    }).compile();

    service = module.get<PdfExtractionService>(PdfExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fallback cleanly on non-binary mock buffer and segment clauses', async () => {
    const mockContractText = `
%PDF-1.4
SECTION 1. Grant of Rights
The Artist hereby assigns all master recording rights exclusively to the Company throughout the Universe in perpetuity.

SECTION 2. Royalty Distribution
Company shall pay Artist fifteen percent (15%) of Net Receipts from streaming distribution.

SECTION 3. Termination
This agreement shall terminate automatically upon the expiration of seven (7) years following initial commercial release.
    `.trim();

    const buffer = Buffer.from(mockContractText, 'utf8');
    const result = await service.extract(buffer);

    expect(result).toBeDefined();
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.fullText).toContain('Grant of Rights');
    expect(result.clauses.length).toBeGreaterThanOrEqual(3);

    const grantClause = result.clauses.find((c) => c.clauseTitle.includes('Grant of Rights'));
    expect(grantClause).toBeDefined();
    expect(grantClause?.content).toContain('assigns all master recording rights');
    expect(grantClause?.pageNumber).toBe(1);

    const royaltyClause = result.clauses.find((c) =>
      c.clauseTitle.includes('Royalty Distribution'),
    );
    expect(royaltyClause).toBeDefined();
    expect(royaltyClause?.content).toContain('fifteen percent (15%)');
  });

  it('should handle unstructured text without clause headers gracefully', async () => {
    const rawParagraph = Buffer.from(
      'This is a simple one paragraph agreement without numbered clauses.',
      'utf8',
    );
    const result = await service.extract(rawParagraph);

    expect(result.fullText).toBe(
      'This is a simple one paragraph agreement without numbered clauses.',
    );
    expect(result.clauses.length).toBe(1);
    expect(result.clauses[0]?.clauseTitle).toContain('This is a simple one paragraph agreement');
  });
});
