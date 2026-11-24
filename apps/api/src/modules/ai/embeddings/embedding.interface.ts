export interface ChunkingOptions {
  maxChunkSizeChars?: number;
  chunkOverlapChars?: number;
}

export interface ChunkMetadata {
  index: number;
  content: string;
  pageNumber?: number;
}

export interface IEmbeddingService {
  chunkDocument(text: string, options?: ChunkingOptions): ChunkMetadata[];
  generateAndStoreEmbeddings(documentId: string, chunks: ChunkMetadata[]): Promise<number>;
  searchRelevantChunks(
    documentId: string,
    query: string,
    topK?: number,
  ): Promise<
    Array<{ chunkId: string; content: string; pageNumber: number | null; similarity: number }>
  >;
}

export const EMBEDDING_SERVICE_TOKEN = 'EMBEDDING_SERVICE_TOKEN';
