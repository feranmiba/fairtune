import { Injectable, Logger } from '@nestjs/common';
import { IAgentTool } from './interfaces/tool.interface';
import { RoyaltyCalculatorTool } from './implementations/royalty-calculator.tool';
import { ContractTextRetrieverTool } from './implementations/contract-text-retriever.tool';
import { ClauseComparisonTool } from './implementations/clause-comparison.tool';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, IAgentTool>();

  constructor(
    royaltyCalculator: RoyaltyCalculatorTool,
    contractTextRetriever: ContractTextRetrieverTool,
    clauseComparison: ClauseComparisonTool,
  ) {
    this.register(royaltyCalculator);
    this.register(contractTextRetriever);
    this.register(clauseComparison);
  }

  register(tool: IAgentTool) {
    this.tools.set(tool.name, tool);
    this.logger.debug(`Registered agent tool: ${tool.name}`);
  }

  getTool(name: string): IAgentTool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): IAgentTool[] {
    return Array.from(this.tools.values());
  }
}
