import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Readable } from 'stream';
import { NegotiationService } from './negotiation.service';
import { PrismaService } from '../../database/prisma.service';
import { NegotiationAgent } from '../ai/agents/negotiation-agent/negotiation.agent';
import { DocumentsService } from '../documents/documents.service';

describe('NegotiationService', () => {
  let service: NegotiationService;
  let prisma: any;
  let mockNegotiationAgent: any;
  let mockDocumentsService: any;

  beforeEach(async () => {
    prisma = {
      aIConversation: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'conv-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      aIMessageReference: {
        create: jest.fn().mockImplementation(({ data }) => ({
          id: 'ref-1',
          ...data,
        })),
      },
    };

    mockNegotiationAgent = {
      execute: jest.fn().mockResolvedValue({
        reply: 'Based on Section 1 of the contract, master rights are assigned in perpetuity.',
        assistantMessageId: 'msg-assist-1',
        referencedExcerpts: [
          {
            chunkId: 'chunk-1',
            clauseId: 'clause-1',
            sourceExcerpt: 'The Artist assigns all masters in perpetuity.',
            pageNumber: 1,
            similarity: 0.92,
          },
        ],
        suggestedQuestions: ['Can we ask for a 5-year reversion?'],
      }),
      executeStream: jest.fn().mockResolvedValue({
        stream: Readable.from(['Based on Section 1, ', 'rights are perpetual.']),
        referencedExcerpts: [
          {
            chunkId: 'chunk-1',
            sourceExcerpt: 'The Artist assigns all masters in perpetuity.',
            pageNumber: 1,
            similarity: 0.92,
          },
        ],
        suggestedQuestions: ['Can we ask for a 5-year reversion?'],
        onComplete: jest.fn().mockResolvedValue('msg-stream-1'),
      }),
    };

    mockDocumentsService = {
      getDocumentById: jest.fn().mockResolvedValue({
        id: 'doc-1',
        userId: 'user-1',
        title: 'Recording Agreement',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NegotiationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NegotiationAgent, useValue: mockNegotiationAgent },
        { provide: DocumentsService, useValue: mockDocumentsService },
      ],
    }).compile();

    service = module.get<NegotiationService>(NegotiationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create conversation with document validation', async () => {
    prisma.aIConversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      userId: 'user-1',
      title: 'Negotiation for Master Rights',
      documentId: 'doc-1',
      messages: [],
    });

    const conversation = await service.createConversation('user-1', {
      title: 'Negotiation for Master Rights',
      documentId: 'doc-1',
    });

    expect(conversation).toBeDefined();
    expect(mockDocumentsService.getDocumentById).toHaveBeenCalledWith('user-1', 'doc-1');
    expect(prisma.aIConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Negotiation for Master Rights',
          documentId: 'doc-1',
        }),
      }),
    );
  });

  it('should send a message, invoke agent, and persist AIMessageReference citations', async () => {
    prisma.aIConversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      userId: 'user-1',
      title: 'Master Rights Negotiation',
      documentId: 'doc-1',
      messages: [],
    });

    const response = await service.sendMessage('user-1', 'conv-1', {
      content: 'What happens to my master recordings?',
    });

    expect(response).toBeDefined();
    expect(response.reply).toContain('master rights are assigned in perpetuity');
    expect(mockNegotiationAgent.execute).toHaveBeenCalled();
    expect(prisma.aIMessageReference.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageId: 'msg-assist-1',
          documentId: 'doc-1',
          chunkId: 'chunk-1',
          sourcePage: 1,
          sourceExcerpt: expect.stringContaining('in perpetuity'),
        }),
      }),
    );
  });

  it('should enforce user isolation on conversation access', async () => {
    prisma.aIConversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      userId: 'other-user',
      title: 'Private Contract Chat',
    });

    await expect(service.getConversationById('user-1', 'conv-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should stream AI response using Server-Sent Events and record completion', async () => {
    prisma.aIConversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      userId: 'user-1',
      title: 'Stream Chat',
      documentId: 'doc-1',
    });

    const mockResponse: any = {
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
    };

    await service.streamMessage('user-1', 'conv-1', { content: 'Explain streaming' }, mockResponse);

    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: context'));
    expect(mockNegotiationAgent.executeStream).toHaveBeenCalled();
  });
});
