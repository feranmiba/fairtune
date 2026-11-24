import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ChatMessage } from '../providers/interfaces/ai-provider.interface';
import { AIMessageSender } from '@fairtune/shared';

@Injectable()
export class ConversationMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentChatHistory(conversationId: string, limit = 10): Promise<ChatMessage[]> {
    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Reverse to chronological order
    const ordered = messages.reverse();

    return ordered.map((m) => ({
      role:
        m.sender === AIMessageSender.USER
          ? 'user'
          : m.sender === AIMessageSender.ASSISTANT
            ? 'assistant'
            : 'system',
      content: m.content,
    }));
  }

  async appendMessage(params: {
    conversationId: string;
    sender: AIMessageSender;
    content: string;
    role?: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
  }) {
    return this.prisma.aIMessage.create({
      data: {
        conversationId: params.conversationId,
        sender: params.sender,
        content: params.content,
        role: params.role || (params.sender === AIMessageSender.USER ? 'user' : 'assistant'),
        promptTokens: params.promptTokens || 0,
        completionTokens: params.completionTokens || 0,
        totalTokens: params.totalTokens || 0,
        model: params.model,
      },
    });
  }
}
