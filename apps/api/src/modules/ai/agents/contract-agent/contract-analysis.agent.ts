import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext } from '../base/agent.interface';
import {
  AgentType,
  AITaskType,
  AIExecutionStatus,
  StructuredContractAnalysisResult,
} from '@fairtune/shared';
import { AiProviderFactory } from '../../providers/provider.factory';
import { AiUsageService } from '../../usage/ai-usage.service';
import { buildContractAnalysisPrompt } from '../../prompts/contract-analysis.prompt';
import { structuredContractAnalysisSchema } from '@fairtune/validation';

export interface ContractAnalysisAgentInput {
  documentTitle: string;
  contractText: string;
}

@Injectable()
export class ContractAnalysisAgent implements IAgent<
  ContractAnalysisAgentInput,
  StructuredContractAnalysisResult
> {
  readonly agentType = AgentType.CONTRACT_AGENT;
  readonly name = 'FairTune Contract Analysis Agent';
  readonly description =
    'Extracts clauses, segments legal conditions, identifies predatory terms, and outputs structured risk reports.';
  readonly allowedTools = ['retrieve_contract_text', 'compare_contract_clauses'];

  private readonly logger = new Logger(ContractAnalysisAgent.name);

  constructor(
    private readonly providerFactory: AiProviderFactory,
    private readonly usageService: AiUsageService,
  ) {}

  async execute(
    input: ContractAnalysisAgentInput,
    context: AgentContext,
  ): Promise<StructuredContractAnalysisResult> {
    const startTime = Date.now();
    const provider = this.providerFactory.getProvider();
    const prompt = buildContractAnalysisPrompt(input.contractText);

    try {
      const response = await provider.generateStructured(
        [
          {
            role: 'system',
            content: 'You are an objective music contract analysis intelligence agent.',
          },
          { role: 'user', content: prompt },
        ],
        structuredContractAnalysisSchema,
      );

      const durationMs = Date.now() - startTime;
      await this.usageService.logUsage({
        userId: context.userId,
        taskType: AITaskType.CONTRACT_ANALYSIS,
        provider: provider.providerName,
        model: response.model,
        usage: response.usage,
        durationMs,
        status: AIExecutionStatus.SUCCESS,
      });

      return response.data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.usageService.logUsage({
        userId: context.userId,
        taskType: AITaskType.CONTRACT_ANALYSIS,
        provider: provider.providerName,
        model: 'unknown',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
        durationMs,
        status: AIExecutionStatus.FAILED,
        errorMessage: (error as Error).message,
      });
      this.logger.error(`Contract analysis agent failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
