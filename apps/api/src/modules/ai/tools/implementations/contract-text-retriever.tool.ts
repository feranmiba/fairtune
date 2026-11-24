import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { IAgentTool } from '../interfaces/tool.interface';
import { PrismaService } from '../../../../database/prisma.service';

const inputSchema = z.object({
  documentId: z.string().uuid(),
  query: z.string().optional(),
  maxChunks: z.number().int().min(1).max(20).default(5),
});

type InputType = z.infer<typeof inputSchema>;

export interface RetrievedChunk {
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
}

@Injectable()
export class ContractTextRetrieverTool implements IAgentTool<
  InputType,
  { documentTitle: string; chunks: RetrievedChunk[] }
> {
  readonly name = 'retrieve_contract_text';
  readonly description =
    'Securely retrieves contract excerpts and clause text for an authorized document.';
  readonly schema = inputSchema;

  constructor(private readonly prisma: PrismaService) {}

  async execute(input: InputType, context?: { userId: string }) {
    if (!context?.userId) {
      throw new ForbiddenException('User context required for document text retrieval');
    }

    const document = await this.prisma.document.findUnique({
      where: { id: input.documentId },
      include: {
        chunks: {
          take: input.maxChunks,
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Contract document not found');
    }

    if (document.userId !== context.userId) {
      throw new ForbiddenException(
        'Access denied: Document does not belong to the requesting user',
      );
    }

    return {
      documentTitle: document.title,
      chunks: document.chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        content: c.content,
        pageNumber: c.pageNumber,
      })),
    };
  }
}
