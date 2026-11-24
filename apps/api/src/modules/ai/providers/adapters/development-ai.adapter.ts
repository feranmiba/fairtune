import { Injectable, Logger } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { Readable } from 'stream';
import {
  IAiProvider,
  ChatMessage,
  CompletionOptions,
  TokenUsage,
  StructuredCompletionResult,
  EmbeddingResult,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class DevelopmentAiAdapter implements IAiProvider {
  readonly providerName = 'development-mock';
  private readonly logger = new Logger(DevelopmentAiAdapter.name);

  estimateTokens(text: string): number {
    if (!text) return 0;
    // Approximating standard cl100k / BPE tokenizer rule of thumb: ~4 characters per token
    return Math.max(1, Math.ceil(text.length / 4));
  }

  private calculateUsage(promptText: string, completionText: string): TokenUsage {
    const promptTokens = this.estimateTokens(promptText);
    const completionTokens = this.estimateTokens(completionText);
    const totalTokens = promptTokens + completionTokens;
    // Standard baseline price: $0.0015/1k input, $0.002/1k output
    const estimatedCostUsd = (promptTokens / 1000) * 0.0015 + (completionTokens / 1000) * 0.002;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: Math.round(estimatedCostUsd * 1000000) / 1000000,
    };
  }

  async generateText(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<{ text: string; usage: TokenUsage; model: string }> {
    const model = options?.model || 'fairtune-dev-mock-v1';
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';

    const text = `[FairTune AI Mock Response]: Regarding your contract query "${lastUserMsg.slice(
      0,
      60,
    )}...", based on the terms provided, rights grants should always specify clear reversion windows and non-cross-collateralized expense deductions.`;

    const fullPrompt = messages.map((m) => m.content).join(' ');
    const usage = this.calculateUsage(fullPrompt, text);

    return {
      text,
      usage,
      model,
    };
  }

  async generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodSchema<T>,
    options?: CompletionOptions,
  ): Promise<StructuredCompletionResult<T>> {
    const model = options?.model || 'fairtune-dev-structured-v1';
    const fullPrompt = messages.map((m) => m.content).join(' ');

    this.logger.debug(`Generating structured completion for prompt length: ${fullPrompt.length}`);

    // If schema matches our structured contract analysis, return a valid populated template
    const defaultData = this.buildDeterministicMockData(messages);

    const parsed = schema.safeParse(defaultData);
    let finalData: T;

    if (parsed.success) {
      finalData = parsed.data;
    } else {
      // In development fallback, create a mock object or throw validation error
      this.logger.warn(
        `Mock data did not match schema, attempting raw parse fallback: ${parsed.error.message}`,
      );
      finalData = defaultData as unknown as T;
    }

    const rawText = JSON.stringify(finalData);
    const usage = this.calculateUsage(fullPrompt, rawText);

    return {
      data: finalData,
      rawText,
      usage,
      model,
      finishReason: 'stop',
    };
  }

  async generateStream(_messages: ChatMessage[], _options?: CompletionOptions): Promise<Readable> {
    const stream = new Readable({
      read() {},
    });

    const words = [
      'This',
      'contract',
      'clause',
      'contains',
      'provisions',
      'that',
      'may',
      'impact',
      'your',
      'future',
      'master',
      'recordings.',
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < words.length) {
        stream.push(words[i] + ' ');
        i++;
      } else {
        clearInterval(interval);
        stream.push(null);
      }
    }, 15);

    return stream;
  }

  async generateEmbedding(
    text: string,
    model = 'text-embedding-3-small',
  ): Promise<EmbeddingResult> {
    const dimensions = 1536;
    // Generate deterministic pseudo-embedding based on string character codes
    const embedding: number[] = new Array(dimensions);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    let norm = 0;
    for (let i = 0; i < dimensions; i++) {
      const val = Math.sin(hash + i);
      embedding[i] = val;
      norm += val * val;
    }

    // Unit normalize vector
    const sqrtNorm = Math.sqrt(norm);
    for (let i = 0; i < dimensions; i++) {
      embedding[i] = (embedding[i] as number) / sqrtNorm;
    }

    return {
      embedding,
      model,
      dimensions,
      tokensUsed: this.estimateTokens(text),
    };
  }

  private buildDeterministicMockData(messages: ChatMessage[]): unknown {
    const lastMsg = messages[messages.length - 1]?.content || '';

    // Check if prompt is about royalty simulation
    if (lastMsg.includes('grossRevenue') || lastMsg.includes('recoupableExpenses')) {
      return {
        grossRevenue: 10000,
        recoupableExpenses: 2000,
        netDistributableRevenue: 8000,
        participants: [
          {
            collaboratorName: 'Lead Artist',
            role: 'Artist',
            percentage: 50,
            allocatedAmount: 4000,
          },
          { collaboratorName: 'Producer', role: 'Producer', percentage: 30, allocatedAmount: 2400 },
          { collaboratorName: 'Songwriter', role: 'Writer', percentage: 20, allocatedAmount: 1600 },
        ],
        unallocatedRemainder: 0,
        currency: 'USD',
        notes: ['All deductions reconciled mathematically.'],
      };
    }

    // Check if prompt is about rights extraction
    if (lastMsg.includes('trackTitle') || lastMsg.includes('ownership')) {
      return {
        trackTitle: 'Midnight Melody',
        artists: ['John Doe'],
        producers: ['Sound Wave Productions'],
        songwriters: ['John Doe', 'Jane Smith'],
        publishers: ['Universal Music Publishing Group'],
        recordLabels: ['Indie Waves Records'],
        masterRightsOwner: 'Indie Waves Records (Perpetual)',
        publishingRightsOwner: 'Universal Music Publishing Group',
        territoryScope: 'Worldwide / Universe',
        missingInformation: ['Mechanical royalty collection agent not designated'],
        inconsistencies: ['Publishing split listed as 100% to publisher despite co-writer credit'],
      };
    }

    // Default: structured contract analysis
    return {
      summary:
        'Contract Analysis Summary: Standard recording agreement with critical assignment of master ownership and unrecouped recoupment clauses.',
      overallRiskLevel: 'HIGH',
      partiesInvolved: ['Recording Artist', 'Independent Record Label'],
      effectiveDate: new Date().toISOString().split('T')[0],
      governingJurisdiction: 'California, USA',
      contractTerm: 'Initial period of 12 months with 3 option periods',
      clauses: [
        {
          category: 'RIGHTS_GRANT',
          clauseTitle: 'Assignment of Master Rights',
          extractedText:
            'Artist hereby grants and assigns to Company in perpetuity all worldwide rights, title, and interest.',
          explanation: 'Permanently transfers entire master ownership to the label.',
          riskLevel: 'CRITICAL',
          riskJustification: 'Artist can never recover catalog rights.',
          suggestedCounterClause:
            'Exclusive distribution license for 5 years with rights reversion.',
        },
      ],
      detectedRoyaltySplits: [
        { beneficiary: 'Record Label', percentage: 85, basis: 'Net Streaming Receipts' },
        { beneficiary: 'Artist', percentage: 15, basis: 'Net Streaming Receipts' },
      ],
      redFlags: ['Perpetual copyright transfer without reversion', 'Broad cross-collateralization'],
    };
  }
}
