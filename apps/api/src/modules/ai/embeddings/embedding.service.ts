import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AiProviderFactory } from '../providers/provider.factory';
import { IEmbeddingService, ChunkingOptions, ChunkMetadata } from './embedding.interface';

@Injectable()
export class EmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: AiProviderFactory,
  ) {}

  chunkDocument(text: string, options?: ChunkingOptions): ChunkMetadata[] {
    const maxChars = options?.maxChunkSizeChars || 1000;
    const overlap = options?.chunkOverlapChars || 150;

    const chunks: ChunkMetadata[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = start + maxChars;
      if (end < text.length) {
        // Try to break at paragraph or period boundary
        const lastNewline = text.lastIndexOf('\n', end);
        const lastPeriod = text.lastIndexOf('. ', end);
        const breakPoint = Math.max(lastNewline, lastPeriod);
        if (breakPoint > start + maxChars * 0.5) {
          end = breakPoint + 1;
        }
      } else {
        end = text.length;
      }

      const chunkContent = text.slice(start, end).trim();
      if (chunkContent.length > 0) {
        chunks.push({
          index,
          content: chunkContent,
          pageNumber: Math.floor(index / 3) + 1, // Approximation
        });
        index++;
      }

      start = end - overlap;
      if (start >= text.length - overlap) break;
    }

    return chunks;
  }

  async generateAndStoreEmbeddings(documentId: string, chunks: ChunkMetadata[]): Promise<number> {
    const provider = this.providerFactory.getProvider();
    let storedCount = 0;

    for (const chunk of chunks) {
      const embeddingRes = await provider.generateEmbedding(chunk.content);

      const dbChunk = await this.prisma.documentChunk.upsert({
        where: {
          documentId_chunkIndex: {
            documentId,
            chunkIndex: chunk.index,
          },
        },
        create: {
          documentId,
          chunkIndex: chunk.index,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          tokenCount: embeddingRes.tokensUsed,
        },
        update: {
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          tokenCount: embeddingRes.tokensUsed,
        },
      });

      await this.prisma.documentEmbedding.upsert({
        where: { chunkId: dbChunk.id },
        create: {
          chunkId: dbChunk.id,
          embedding: embeddingRes.embedding,
          model: embeddingRes.model,
          dimensions: embeddingRes.dimensions,
        },
        update: {
          embedding: embeddingRes.embedding,
          model: embeddingRes.model,
          dimensions: embeddingRes.dimensions,
        },
      });

      storedCount++;
    }

    this.logger.log(
      `Generated and stored ${storedCount} chunk embeddings for document ${documentId}`,
    );
    return storedCount;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  async searchRelevantChunks(
    documentId: string,
    query: string,
    topK = 3,
  ): Promise<
    Array<{ chunkId: string; content: string; pageNumber: number | null; similarity: number }>
  > {
    const provider = this.providerFactory.getProvider();
    const queryEmbedding = await provider.generateEmbedding(query);

    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      include: { embedding: true },
    });

    const scored = chunks
      .filter((c) => c.embedding?.embedding)
      .map((c) => {
        const rawVector = c.embedding!.embedding as number[];
        const similarity = this.cosineSimilarity(queryEmbedding.embedding, rawVector);
        return {
          chunkId: c.id,
          content: c.content,
          pageNumber: c.pageNumber,
          similarity,
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return scored;
  }
}
