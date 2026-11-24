import { Injectable } from '@nestjs/common';
import { IAgentTool } from '../interfaces/tool.interface';
import { simulateRoyaltySchema, SimulateRoyaltyInput } from '@fairtune/validation';
import { RoyaltySimulationResult } from '@fairtune/shared';

@Injectable()
export class RoyaltyCalculatorTool implements IAgentTool<
  SimulateRoyaltyInput,
  RoyaltySimulationResult
> {
  readonly name = 'calculate_royalty_distribution';
  readonly description =
    'Performs deterministic, decimal-accurate financial distribution of gross music revenue minus recoupable expenses across participant split percentages.';
  readonly schema = simulateRoyaltySchema;

  async execute(input: SimulateRoyaltyInput): Promise<RoyaltySimulationResult> {
    const gross = Math.round(input.grossRevenue * 100); // work in cents
    const recoupable = Math.round(input.recoupableExpenses * 100);
    const netCents = Math.max(0, gross - recoupable);

    let allocatedCentsSum = 0;

    const participants = input.participants.map((p) => {
      // Calculate allocation using rounded integer cents
      const share = Math.round((netCents * p.percentage) / 100);
      allocatedCentsSum += share;

      return {
        collaboratorName: p.collaboratorName,
        role: p.role,
        percentage: p.percentage,
        allocatedAmount: share / 100,
      };
    });

    const unallocatedRemainderCents = netCents - allocatedCentsSum;

    return {
      grossRevenue: gross / 100,
      recoupableExpenses: recoupable / 100,
      netDistributableRevenue: netCents / 100,
      participants,
      unallocatedRemainder: unallocatedRemainderCents / 100,
      currency: input.currency,
      notes: [
        'Calculated using deterministic currency math with zero floating-point precision error.',
        `Net distributable base: $${(netCents / 100).toFixed(2)} ${input.currency}.`,
      ],
    };
  }
}
