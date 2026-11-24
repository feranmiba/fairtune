import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AITaskType, AIExecutionStatus } from '@fairtune/shared';
import { TokenUsage } from '../providers/interfaces/ai-provider.interface';

export interface LogAiUsageParams {
  userId: string;
  taskType: AITaskType;
  provider: string;
  model: string;
  usage: TokenUsage;
  durationMs: number;
  status: AIExecutionStatus;
  errorMessage?: string;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logUsage(params: LogAiUsageParams) {
    try {
      const record = await this.prisma.aIUsageLog.create({
        data: {
          userId: params.userId,
          taskType: params.taskType,
          provider: params.provider,
          model: params.model,
          promptTokens: params.usage.promptTokens,
          completionTokens: params.usage.completionTokens,
          totalTokens: params.usage.totalTokens,
          estimatedCostUsd: new Prisma.Decimal(params.usage.estimatedCostUsd.toFixed(6)),
          durationMs: params.durationMs,
          status: params.status,
          errorMessage: params.errorMessage,
        },
      });

      this.logger.debug(
        `Logged AI task [${params.taskType}] for user ${params.userId}: ${params.usage.totalTokens} tokens, ~$${params.usage.estimatedCostUsd.toFixed(4)} USD`,
      );

      return record;
    } catch (error) {
      this.logger.warn(`Failed to record AI usage log: ${(error as Error).message}`);
      return null;
    }
  }

  async getUserAggregatedUsage(userId: string) {
    const logs = await this.prisma.aIUsageLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalTokens = logs.reduce((acc, log) => acc + log.totalTokens, 0);
    const totalCost = logs.reduce((acc, log) => acc + Number(log.estimatedCostUsd), 0);

    return {
      totalTasks: logs.length,
      totalTokens,
      totalEstimatedCostUsd: Math.round(totalCost * 10000) / 10000,
      recentLogs: logs.slice(0, 10),
    };
  }
}
