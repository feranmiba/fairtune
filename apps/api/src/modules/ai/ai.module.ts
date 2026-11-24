import { Module, Global } from '@nestjs/common';
import { DevelopmentAiAdapter } from './providers/adapters/development-ai.adapter';
import { AiProviderFactory } from './providers/provider.factory';
import { AiUsageService } from './usage/ai-usage.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { ConversationMemoryService } from './memory/conversation-memory.service';

// Tools
import { RoyaltyCalculatorTool } from './tools/implementations/royalty-calculator.tool';
import { ContractTextRetrieverTool } from './tools/implementations/contract-text-retriever.tool';
import { ClauseComparisonTool } from './tools/implementations/clause-comparison.tool';
import { RoyaltyEarningsRetrieverTool } from './tools/implementations/royalty-earnings-retriever.tool';
import { RoyaltyAnomalyRetrieverTool } from './tools/implementations/royalty-anomaly-retriever.tool';
import { ToolRegistry } from './tools/tool.registry';

// Agents
import { ContractAnalysisAgent } from './agents/contract-agent/contract-analysis.agent';
import { NegotiationAgent } from './agents/negotiation-agent/negotiation.agent';
import { RoyaltyIntelligenceAgent } from './agents/royalty-agent/royalty-intelligence.agent';
import { RightsIntelligenceAgent } from './agents/rights-agent/rights-intelligence.agent';

@Global()
@Module({
  providers: [
    DevelopmentAiAdapter,
    AiProviderFactory,
    AiUsageService,
    EmbeddingService,
    ConversationMemoryService,
    RoyaltyCalculatorTool,
    ContractTextRetrieverTool,
    ClauseComparisonTool,
    RoyaltyEarningsRetrieverTool,
    RoyaltyAnomalyRetrieverTool,
    ToolRegistry,
    ContractAnalysisAgent,
    NegotiationAgent,
    RoyaltyIntelligenceAgent,
    RightsIntelligenceAgent,
  ],
  exports: [
    AiProviderFactory,
    AiUsageService,
    EmbeddingService,
    ConversationMemoryService,
    RoyaltyEarningsRetrieverTool,
    RoyaltyAnomalyRetrieverTool,
    ToolRegistry,
    ContractAnalysisAgent,
    NegotiationAgent,
    RoyaltyIntelligenceAgent,
    RightsIntelligenceAgent,
  ],
})
export class AiModule {}
