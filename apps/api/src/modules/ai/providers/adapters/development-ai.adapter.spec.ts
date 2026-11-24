import { DevelopmentAiAdapter } from './development-ai.adapter';
import { z } from 'zod';

describe('DevelopmentAiAdapter', () => {
  let adapter: DevelopmentAiAdapter;

  beforeEach(() => {
    adapter = new DevelopmentAiAdapter();
  });

  describe('estimateTokens', () => {
    it('should approximate ~4 characters per token', () => {
      const text = 'This is a test contract clause containing music copyright terms.';
      const tokens = adapter.estimateTokens(text);
      expect(tokens).toBeGreaterThan(10);
      expect(tokens).toBeLessThan(25);
    });

    it('should return 0 for empty string', () => {
      expect(adapter.estimateTokens('')).toBe(0);
    });
  });

  describe('generateEmbedding', () => {
    it('should generate a 1536-dimensional unit-normalized embedding vector', async () => {
      const text = 'Master rights grant clause in perpetuity';
      const result = await adapter.generateEmbedding(text);

      expect(result.dimensions).toBe(1536);
      expect(result.embedding).toHaveLength(1536);

      // Verify unit norm (length = 1.0)
      const normSquared = result.embedding.reduce((acc, val) => acc + val * val, 0);
      expect(Math.sqrt(normSquared)).toBeCloseTo(1.0, 4);
    });
  });

  describe('generateStructured', () => {
    it('should return valid data conforming to schema with token usage metadata', async () => {
      const testSchema = z.object({
        summary: z.string(),
        overallRiskLevel: z.string(),
      });

      const result = await adapter.generateStructured(
        [{ role: 'user', content: 'Analyze contract risks' }],
        testSchema,
      );

      expect(result.data).toBeDefined();
      expect(result.usage.promptTokens).toBeGreaterThan(0);
      expect(result.usage.completionTokens).toBeGreaterThan(0);
      expect(result.usage.estimatedCostUsd).toBeGreaterThan(0);
      expect(result.finishReason).toBe('stop');
    });
  });

  describe('generateStream', () => {
    it('should produce readable stream of chunks', async () => {
      const stream = await adapter.generateStream([{ role: 'user', content: 'Explain clause' }]);
      const chunks: string[] = [];

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk.toString()));
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('contract clause');
    });
  });
});
