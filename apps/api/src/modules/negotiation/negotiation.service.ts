import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { NegotiationAgent } from '../ai/agents/negotiation-agent/negotiation.agent';
import { CreateConversationInput, SendAIMessageInput } from '@fairtune/validation';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class NegotiationService {
  private readonly logger = new Logger(NegotiationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly negotiationAgent: NegotiationAgent,
    private readonly documentsService: DocumentsService,
  ) {}

  async createConversation(userId: string, input: CreateConversationInput) {
    if (input.documentId) {
      await this.documentsService.getDocumentById(userId, input.documentId);
    }

    const conversation = await this.prisma.aIConversation.create({
      data: {
        userId,
        documentId: input.documentId,
        title: input.title,
      },
    });

    if (input.initialMessage) {
      await this.sendMessage(userId, conversation.id, {
        content: input.initialMessage,
      });
    }

    return this.getConversationById(userId, conversation.id);
  }

  async listUserConversations(userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            originalFileName: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  async getConversationById(userId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            originalFileName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            references: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this conversation');
    }

    return conversation;
  }

  async sendMessage(userId: string, conversationId: string, input: SendAIMessageInput) {
    const conversation = await this.getConversationById(userId, conversationId);

    const agentOutput = await this.negotiationAgent.execute(
      {
        conversationId,
        userMessage: input.content,
        documentId: conversation.documentId || undefined,
        referencedClauseIds: input.referencedClauseIds,
      },
      {
        userId,
        conversationId,
        documentId: conversation.documentId || undefined,
      },
    );

    // Save citation references in DB if attached to document and message
    if (
      conversation.documentId &&
      agentOutput.assistantMessageId &&
      agentOutput.referencedExcerpts.length > 0
    ) {
      for (const ref of agentOutput.referencedExcerpts) {
        try {
          await this.prisma.aIMessageReference.create({
            data: {
              messageId: agentOutput.assistantMessageId,
              documentId: conversation.documentId,
              chunkId: ref.chunkId,
              clauseId: ref.clauseId,
              sourcePage: ref.pageNumber,
              sourceExcerpt: ref.sourceExcerpt,
              relevanceScore: ref.similarity ? Number(ref.similarity.toFixed(4)) : null,
            },
          });
        } catch (refError) {
          this.logger.warn(`Failed to persist message reference: ${(refError as Error).message}`);
        }
      }
    }

    // Update conversation updatedAt timestamp
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId,
      messageId: agentOutput.assistantMessageId,
      reply: agentOutput.reply,
      referencedExcerpts: agentOutput.referencedExcerpts,
      suggestedQuestions: agentOutput.suggestedQuestions,
    };
  }

  async streamMessage(
    userId: string,
    conversationId: string,
    input: SendAIMessageInput,
    res: Response,
  ) {
    const conversation = await this.getConversationById(userId, conversationId);

    // Set Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const streamResult = await this.negotiationAgent.executeStream(
      {
        conversationId,
        userMessage: input.content,
        documentId: conversation.documentId || undefined,
        referencedClauseIds: input.referencedClauseIds,
      },
      {
        userId,
        conversationId,
        documentId: conversation.documentId || undefined,
      },
    );

    // 1. Emit grounding context & citations event
    res.write(
      `event: context\ndata: ${JSON.stringify({
        references: streamResult.referencedExcerpts,
      })}\n\n`,
    );

    let accumulatedText = '';

    streamResult.stream.on('data', (chunk: Buffer | string) => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString();
      accumulatedText += text;
      res.write(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`);
    });

    streamResult.stream.on('end', async () => {
      try {
        const assistantMessageId = await streamResult.onComplete(accumulatedText);

        // Save reference citations
        if (
          conversation.documentId &&
          assistantMessageId &&
          streamResult.referencedExcerpts.length > 0
        ) {
          for (const ref of streamResult.referencedExcerpts) {
            try {
              await this.prisma.aIMessageReference.create({
                data: {
                  messageId: assistantMessageId,
                  documentId: conversation.documentId,
                  chunkId: ref.chunkId,
                  clauseId: ref.clauseId,
                  sourcePage: ref.pageNumber,
                  sourceExcerpt: ref.sourceExcerpt,
                  relevanceScore: ref.similarity ? Number(ref.similarity.toFixed(4)) : null,
                },
              });
            } catch (refError) {
              this.logger.warn(`Failed to persist reference: ${(refError as Error).message}`);
            }
          }
        }

        await this.prisma.aIConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        res.write(
          `event: done\ndata: ${JSON.stringify({
            messageId: assistantMessageId,
            suggestedQuestions: streamResult.suggestedQuestions,
          })}\n\n`,
        );
      } catch (err) {
        this.logger.error(`Error completing stream: ${(err as Error).message}`);
        res.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
      } finally {
        res.end();
      }
    });

    streamResult.stream.on('error', (err: Error) => {
      this.logger.error(`Stream error: ${err.message}`);
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  }
}
