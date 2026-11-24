import { ZodTypeAny } from 'zod';

export interface IAgentTool<TInput = any, TOutput = any> {
  readonly name: string;
  readonly description: string;
  readonly schema: ZodTypeAny;
  execute(input: TInput, context?: { userId: string }): Promise<TOutput>;
}
