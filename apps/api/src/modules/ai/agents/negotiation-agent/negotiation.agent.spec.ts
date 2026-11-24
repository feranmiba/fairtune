import { Test, TestingModule } from '@nestjs/testing';
import { NegotiationAgent } from './negotiation.agent';
import { AiProviderFactory } from '../../providers/provider.factory';
import { AiUsageService } from '../../usage/ai-usage.service';
import { ConversationMemoryService } from '../../memory/conversation-memory.service';
import { EmbeddingService } from '../../embeddings/embedding.service';

describe('NegotiationAgent', () => {
  let agent: NegotiationAgent;
  let mockProvider: {
    generateText: jest.Mock;
    generateStream?: jest.Mock;
    estimateTokens?: jest.Mock;
    providerName: string;
  };
  let mockUsageService: {
    logUsage: jest.Mock;
  };
  let mockMemoryService: {
    appendMessage: jest.Mock;
    getRecentChatHistory: jest.Mock;
  };
  let mockEmbeddingService: {
    searchRelevantChunks: jest.Mock;
  };

  beforeEach(async () => {
    mockProvider = {
      providerName: 'test-provider',
      generateText: jest.fn().mockResolvedValue({
        text: 'You should negotiate a 5-year reversion window for your masters.',
        usage: {
          promptTokens: 40,
          completionTokens: 60,
          totalTokens: 100,
          estimatedCostUsd: 0.0002,
        },
        model: 'test-model',
      }),
    };

    mockUsageService = {
      logUsage: jest.fn().mockResolvedValue({}),
    };

    mockMemoryService = {
      appendMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
      getRecentChatHistory: jest.fn().mockResolvedValue([]),
    };

    mockEmbeddingService = {
      searchRelevantChunks: jest.fn().mockResolvedValue([
        {
          chunkId: 'chunk-1',
          content: 'Master recordings assigned in perpetuity to Company.',
          pageNumber: 2,
          similarity: 0.88,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationAgent,
        {
          provide: AiProviderFactory,
          useValue: { getProvider: () => mockProvider },
        },
        { provide: AiUsageService, useValue: mockUsageService },
        { provide: ConversationMemoryService, useValue: mockMemoryService },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
      ],
    }).compile();

    agent = module.get<NegotiationAgent>(NegotiationAgent);
  });

  it('should retrieve relevant grounded excerpts when documentId is provided', async () => {
    const result = await agent.execute(
      {
        conversationId: 'conv-1',
        userMessage: 'What does the master ownership clause say?',
        documentId: 'doc-1',
      },
      {
        userId: 'user-1',
        conversationId: 'conv-1',
        documentId: 'doc-1',
      },
    );

    expect(mockEmbeddingService.searchRelevantChunks).toHaveBeenCalledWith(
      'doc-1',
      expect.any(String),
      3,
    );
    expect(result.referencedExcerpts).toHaveLength(1);
    expect(result.referencedExcerpts[0]?.sourceExcerpt).toContain('Master recordings assigned');
    expect(mockMemoryService.appendMessage).toHaveBeenCalledTimes(2); // user and assistant
    expect(mockUsageService.logUsage).toHaveBeenCalled();
  });

  it('should support streaming responses via executeStream', async () => {
    const { Readable } = await import('stream');
    mockProvider.generateStream = jest
      .fn()
      .mockResolvedValue(Readable.from(['Chunk 1 ', 'Chunk 2']));
    mockProvider.estimateTokens = jest.fn().mockReturnValue(15);

    const streamResult = await agent.executeStream(
      {
        conversationId: 'conv-1',
        userMessage: 'Explain streaming clause',
        documentId: 'doc-1',
      },
      {
        userId: 'user-1',
        conversationId: 'conv-1',
        documentId: 'doc-1',
      },
    );

    expect(streamResult.stream).toBeDefined();
    expect(streamResult.referencedExcerpts).toHaveLength(1);

    const messageId = await streamResult.onComplete('Chunk 1 Chunk 2');
    expect(messageId).toBeDefined();
    expect(mockMemoryService.appendMessage).toHaveBeenCalled();
  });
});
