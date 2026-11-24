import { AgentType } from '@fairtune/shared';

export interface AgentContext {
  userId: string;
  documentId?: string;
  conversationId?: string;
}

export interface IAgent<TInput = unknown, TOutput = unknown> {
  readonly agentType: AgentType;
  readonly name: string;
  readonly description: string;
  readonly allowedTools: string[];

  execute(input: TInput, context: AgentContext): Promise<TOutput>;
}
