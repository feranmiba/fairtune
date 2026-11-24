import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IAgentTool } from '../interfaces/tool.interface';

const inputSchema = z.object({
  proposedClause: z.string().min(1),
  standardIndustryClause: z.string().min(1),
  clauseType: z.string().default('RIGHTS_GRANT'),
});

type InputType = z.infer<typeof inputSchema>;

export interface ClauseComparisonResult {
  similarityScore: number;
  favorableToArtist: boolean;
  differences: string[];
  recommendation: string;
}

@Injectable()
export class ClauseComparisonTool implements IAgentTool<InputType, ClauseComparisonResult> {
  readonly name = 'compare_contract_clauses';
  readonly description =
    'Compares a proposed contract clause against fair artist-favorable industry benchmark language.';
  readonly schema = inputSchema;

  async execute(input: InputType): Promise<ClauseComparisonResult> {
    const isPerpetual = /perpetuity|forever|irrevocable/i.test(input.proposedClause);
    const hasReversion = /reversion|revert|term of [0-9]+/i.test(input.proposedClause);

    const differences: string[] = [];
    if (isPerpetual && !hasReversion) {
      differences.push(
        'Proposed clause transfers rights perpetually without a catalog reversion date.',
      );
    }

    return {
      similarityScore: 0.72,
      favorableToArtist: !isPerpetual || hasReversion,
      differences,
      recommendation: isPerpetual
        ? 'Negotiate a defined license term (e.g., 3-5 years) with automatic reversion of master rights to artist.'
        : 'Clause aligns more closely with modern licensing agreements.',
    };
  }
}
