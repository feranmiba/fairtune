import { ZodSchema } from 'zod';
import { Readable } from 'stream';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ZodSchema;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  tools?: ToolDefinition[];
  systemInstructions?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface StructuredCompletionResult<T> {
  data: T;
  rawText: string;
  usage: TokenUsage;
  model: string;
  finishReason: string;
  toolCalls?: ToolCall[];
}

export interface StreamingChunk {
  delta: string;
  isComplete: boolean;
  usage?: TokenUsage;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  tokensUsed: number;
}

export interface IAiProvider {
  readonly providerName: string;

  generateText(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<{ text: string; usage: TokenUsage; model: string }>;

  generateStructured<T>(
    messages: ChatMessage[],
    schema: ZodSchema<T>,
    options?: CompletionOptions,
  ): Promise<StructuredCompletionResult<T>>;

  generateStream(messages: ChatMessage[], options?: CompletionOptions): Promise<Readable>;

  generateEmbedding(text: string, model?: string): Promise<EmbeddingResult>;

  estimateTokens(text: string): number;
}

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER_TOKEN';
