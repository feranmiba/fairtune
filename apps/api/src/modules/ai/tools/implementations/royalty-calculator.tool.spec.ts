import { RoyaltyCalculatorTool } from './royalty-calculator.tool';

describe('RoyaltyCalculatorTool', () => {
  let tool: RoyaltyCalculatorTool;

  beforeEach(() => {
    tool = new RoyaltyCalculatorTool();
  });

  it('should accurately calculate net distributable revenue after expenses', async () => {
    const input = {
      grossRevenue: 10000,
      recoupableExpenses: 2500,
      currency: 'USD',
      participants: [
        { collaboratorName: 'Lead Artist', role: 'Artist', percentage: 50 },
        { collaboratorName: 'Producer', role: 'Producer', percentage: 30 },
        { collaboratorName: 'Songwriter', role: 'Songwriter', percentage: 20 },
      ],
    };

    const result = await tool.execute(input);

    expect(result.grossRevenue).toBe(10000);
    expect(result.recoupableExpenses).toBe(2500);
    expect(result.netDistributableRevenue).toBe(7500);

    // 50% of 7500 = 3750
    expect(result.participants[0]?.allocatedAmount).toBe(3750);
    // 30% of 7500 = 2250
    expect(result.participants[1]?.allocatedAmount).toBe(2250);
    // 20% of 7500 = 1500
    expect(result.participants[2]?.allocatedAmount).toBe(1500);

    expect(result.unallocatedRemainder).toBe(0);
  });

  it('should handle fractional percentages with exact cents precision and zero floating-point error', async () => {
    const input = {
      grossRevenue: 1000,
      recoupableExpenses: 0,
      currency: 'USD',
      participants: [
        { collaboratorName: 'Artist A', role: 'Artist', percentage: 33.33 },
        { collaboratorName: 'Artist B', role: 'Artist', percentage: 33.33 },
        { collaboratorName: 'Artist C', role: 'Artist', percentage: 33.34 },
      ],
    };

    const result = await tool.execute(input);

    expect(result.netDistributableRevenue).toBe(1000);
    const sumAllocated = result.participants.reduce((acc, p) => acc + p.allocatedAmount, 0);
    expect(sumAllocated + result.unallocatedRemainder).toBe(1000);
  });
});
