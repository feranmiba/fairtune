import { Injectable, Logger } from '@nestjs/common';
import { IAgent, AgentContext } from '../base/agent.interface';
import { AgentType, AITaskType, AIExecutionStatus, RightsExtractionResult } from '@fairtune/shared';
import { AiProviderFactory } from '../../providers/provider.factory';
import { AiUsageService } from '../../usage/ai-usage.service';
import { buildRightsIntelligencePrompt } from '../../prompts/rights-intelligence.prompt';
import { rightsExtractionResultSchema } from '@fairtune/validation';

export interface RightsIntelligenceAgentInput {
  documentId: string;
  contractText: string;
}

@Injectable()
export class RightsIntelligenceAgent implements IAgent<
  RightsIntelligenceAgentInput,
  RightsExtractionResult
> {
  readonly agentType = AgentType.RIGHTS_AGENT;
  readonly name = 'FairTune Music Rights Intelligence Agent';
  readonly description =
    'Extracts music copyright metadata, identifies contributors, and highlights ownership gaps and document inconsistencies.';
  readonly allowedTools = ['retrieve_contract_text'];

  private readonly logger = new Logger(RightsIntelligenceAgent.name);

  constructor(
    private readonly providerFactory: AiProviderFactory,
    private readonly usageService: AiUsageService,
  ) {}

  async execute(
    input: RightsIntelligenceAgentInput,
    context: AgentContext,
  ): Promise<RightsExtractionResult> {
    const startTime = Date.now();
    const provider = this.providerFactory.getProvider();
    const systemPrompt = buildRightsIntelligencePrompt();

    try {
      const response = await provider.generateStructured(
        [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract copyright and music ownership metadata from this text:\n\n${input.contractText.slice(0, 4000)}`,
          },
        ],
        rightsExtractionResultSchema,
      );

      const durationMs = Date.now() - startTime;
      await this.usageService.logUsage({
        userId: context.userId,
        taskType: AITaskType.RIGHTS_EXTRACTION,
        provider: provider.providerName,
        model: response.model,
        usage: response.usage,
        durationMs,
        status: AIExecutionStatus.SUCCESS,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Rights intelligence agent failed: ${(error as Error).message}`);
      throw error;
    }
  }
}
