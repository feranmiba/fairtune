import { Injectable } from '@nestjs/common';
import { IAgent, AgentContext } from '../base/agent.interface';
import {
  AgentType,
  AITaskType,
  AIExecutionStatus,
  RoyaltySimulationResult,
} from '@fairtune/shared';
import { RoyaltyCalculatorTool } from '../../tools/implementations/royalty-calculator.tool';
import { AiUsageService } from '../../usage/ai-usage.service';
import { SimulateRoyaltyInput } from '@fairtune/validation';

@Injectable()
export class RoyaltyIntelligenceAgent implements IAgent<
  SimulateRoyaltyInput,
  RoyaltySimulationResult
> {
  readonly agentType = AgentType.ROYALTY_AGENT;
  readonly name = 'FairTune Royalty Intelligence Agent';
  readonly description =
    'Calculates deterministic revenue allocations, simulates split arrangements, and analyzes recoupment scenarios.';
  readonly allowedTools = ['calculate_royalty_distribution'];

  constructor(
    private readonly calculatorTool: RoyaltyCalculatorTool,
    private readonly usageService: AiUsageService,
  ) {}

  async execute(
    input: SimulateRoyaltyInput,
    context: AgentContext,
  ): Promise<RoyaltySimulationResult> {
    const startTime = Date.now();

    // Deterministic arithmetic via dedicated tool
    const result = await this.calculatorTool.execute(input);

    const durationMs = Date.now() - startTime;
    await this.usageService.logUsage({
      userId: context.userId,
      taskType: AITaskType.ROYALTY_SIMULATION,
      provider: 'deterministic-calculator',
      model: 'math-precision-v1',
      usage: {
        promptTokens: 50,
        completionTokens: 80,
        totalTokens: 130,
        estimatedCostUsd: 0.0002,
      },
      durationMs,
      status: AIExecutionStatus.SUCCESS,
    });

    return result;
  }
}
