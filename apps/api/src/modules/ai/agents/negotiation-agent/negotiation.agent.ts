import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { IAgent, AgentContext } from '../base/agent.interface';
import { AgentType, AITaskType, AIExecutionStatus, AIMessageSender } from '@fairtune/shared';
import { AiProviderFactory } from '../../providers/provider.factory';
import { AiUsageService } from '../../usage/ai-usage.service';
import { ConversationMemoryService } from '../../memory/conversation-memory.service';
import { EmbeddingService } from '../../embeddings/embedding.service';
import { buildNegotiationPrompt } from '../../prompts/negotiation.prompt';

export interface NegotiationAgentInput {
  conversationId: string;
  userMessage: string;
  documentId?: string;
  referencedClauseIds?: string[];
}

export interface NegotiationAgentOutput {
  reply: string;
  assistantMessageId?: string;
  referencedExcerpts: Array<{
    chunkId?: string;
    clauseId?: string;
    sourceExcerpt: string;
    pageNumber?: number | null;
    similarity?: number;
  }>;
  suggestedQuestions: string[];
}

@Injectable()
export class NegotiationAgent implements IAgent<NegotiationAgentInput, NegotiationAgentOutput> {
  readonly agentType = AgentType.NEGOTIATION_AGENT;
  readonly name = 'FairTune Contract Negotiation Copilot';
  readonly description =
    'Provides document-grounded explanations, counter-clause language, and negotiation advice for contracts.';
  readonly allowedTools = ['retrieve_contract_text', 'compare_contract_clauses'];

  private readonly logger = new Logger(NegotiationAgent.name);

  constructor(
    private readonly providerFactory: AiProviderFactory,
    private readonly usageService: AiUsageService,
    private readonly memoryService: ConversationMemoryService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async execute(
    input: NegotiationAgentInput,
    context: AgentContext,
  ): Promise<NegotiationAgentOutput> {
    const startTime = Date.now();
    const provider = this.providerFactory.getProvider();

    // Retrieve grounding context if document is linked
    const referencedExcerpts: Array<{
      chunkId?: string;
      clauseId?: string;
      sourceExcerpt: string;
      pageNumber?: number | null;
      similarity?: number;
    }> = [];

    if (input.documentId) {
      const relevant = await this.embeddingService.searchRelevantChunks(
        input.documentId,
        input.userMessage,
        3,
      );
      for (const r of relevant) {
        referencedExcerpts.push({
          chunkId: r.chunkId,
          sourceExcerpt: r.content.slice(0, 300),
          pageNumber: r.pageNumber,
          similarity: r.similarity,
        });
      }
    }

    const systemPrompt = buildNegotiationPrompt(
      'Contract Negotiation Context',
      referencedExcerpts.map((r) => r.sourceExcerpt),
    );

    // Save user message to memory
    await this.memoryService.appendMessage({
      conversationId: input.conversationId,
      sender: AIMessageSender.USER,
      content: input.userMessage,
    });

    const recentHistory = await this.memoryService.getRecentChatHistory(input.conversationId, 6);

    const messages = [{ role: 'system' as const, content: systemPrompt }, ...recentHistory];

    try {
      const response = await provider.generateText(messages);

      // Save assistant response to memory
      const assistantMessage = await this.memoryService.appendMessage({
        conversationId: input.conversationId,
        sender: AIMessageSender.ASSISTANT,
        content: response.text,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
        model: response.model,
      });

      const durationMs = Date.now() - startTime;
      await this.usageService.logUsage({
        userId: context.userId,
        taskType: AITaskType.NEGOTIATION,
        provider: provider.providerName,
        model: response.model,
        usage: response.usage,
        durationMs,
        status: AIExecutionStatus.SUCCESS,
      });

      return {
        reply: response.text,
        assistantMessageId: assistantMessage?.id,
        referencedExcerpts,
        suggestedQuestions: [
          'Can we insert a reversion clause after 5 years?',
          'Will recoupment be restricted strictly to direct recording advances?',
        ],
      };
    } catch (error) {
      this.logger.error(`Negotiation agent execution failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async executeStream(
    input: NegotiationAgentInput,
    context: AgentContext,
  ): Promise<{
    stream: Readable;
    referencedExcerpts: Array<{
      chunkId?: string;
      clauseId?: string;
      sourceExcerpt: string;
      pageNumber?: number | null;
      similarity?: number;
    }>;
    suggestedQuestions: string[];
    onComplete: (accumulatedText: string) => Promise<string>;
  }> {
    const startTime = Date.now();
    const provider = this.providerFactory.getProvider();

    const referencedExcerpts: Array<{
      chunkId?: string;
      clauseId?: string;
      sourceExcerpt: string;
      pageNumber?: number | null;
      similarity?: number;
    }> = [];

    if (input.documentId) {
      const relevant = await this.embeddingService.searchRelevantChunks(
        input.documentId,
        input.userMessage,
        3,
      );
      for (const r of relevant) {
        referencedExcerpts.push({
          chunkId: r.chunkId,
          sourceExcerpt: r.content.slice(0, 300),
          pageNumber: r.pageNumber,
          similarity: r.similarity,
        });
      }
    }

    const systemPrompt = buildNegotiationPrompt(
      'Contract Negotiation Context',
      referencedExcerpts.map((r) => r.sourceExcerpt),
    );

    // Save user message to memory
    await this.memoryService.appendMessage({
      conversationId: input.conversationId,
      sender: AIMessageSender.USER,
      content: input.userMessage,
    });

    const recentHistory = await this.memoryService.getRecentChatHistory(input.conversationId, 6);
    const messages = [{ role: 'system' as const, content: systemPrompt }, ...recentHistory];

    const stream = await provider.generateStream(messages);

    const onComplete = async (accumulatedText: string): Promise<string> => {
      const estimatedTokens = provider.estimateTokens(accumulatedText);
      const assistantMessage = await this.memoryService.appendMessage({
        conversationId: input.conversationId,
        sender: AIMessageSender.ASSISTANT,
        content: accumulatedText,
        promptTokens: 200,
        completionTokens: estimatedTokens,
        totalTokens: 200 + estimatedTokens,
        model: 'fairtune-negotiation-copilot',
      });

      const durationMs = Date.now() - startTime;
      await this.usageService.logUsage({
        userId: context.userId,
        taskType: AITaskType.NEGOTIATION,
        provider: provider.providerName,
        model: 'fairtune-negotiation-copilot',
        usage: {
          promptTokens: 200,
          completionTokens: estimatedTokens,
          totalTokens: 200 + estimatedTokens,
          estimatedCostUsd: 0.0003,
        },
        durationMs,
        status: AIExecutionStatus.SUCCESS,
      });

      return assistantMessage.id;
    };

    return {
      stream,
      referencedExcerpts,
      suggestedQuestions: [
        'Can we insert a reversion clause after 5 years?',
        'Will recoupment be restricted strictly to direct recording advances?',
      ],
      onComplete,
    };
  }
}
