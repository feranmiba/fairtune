import { z } from 'zod';

export const simulationParticipantSchema = z.object({
  collaboratorName: z.string().min(1).max(100).trim(),
  role: z.string().min(1).max(100).trim(),
  percentage: z.number().min(0.01).max(100.0),
});

export const simulateRoyaltySchema = z
  .object({
    grossRevenue: z.number().nonnegative('Gross revenue must be zero or positive'),
    recoupableExpenses: z
      .number()
      .nonnegative('Recoupable expenses must be zero or positive')
      .default(0),
    currency: z.string().length(3).toUpperCase().default('USD'),
    participants: z.array(simulationParticipantSchema).min(1, 'At least one participant required'),
  })
  .refine(
    (data) => {
      const sum = data.participants.reduce((acc, p) => acc + p.percentage, 0);
      return Math.round(sum * 100) / 100 <= 100.0;
    },
    {
      message: 'Total participant percentages cannot exceed 100.00%',
      path: ['participants'],
    },
  )
  .refine((data) => data.grossRevenue >= data.recoupableExpenses, {
    message: 'Recoupable expenses cannot exceed gross revenue in standard calculation',
    path: ['recoupableExpenses'],
  });

export const saveSimulationSchema = simulateRoyaltySchema.and(
  z.object({
    title: z.string().max(200).trim().optional(),
  }),
);

export const historicalPeriodSchema = z.object({
  period: z.string().min(1, 'Period label required (e.g. 2024-Q1)'),
  actualGrossRevenue: z.number().nonnegative('Gross revenue must be zero or positive'),
  actualRecouped: z.number().nonnegative().default(0),
});

export const forecastEarningsSchema = z.object({
  agreementId: z.string().uuid().optional(),
  title: z.string().max(200).trim().optional(),
  historicalPeriods: z
    .array(historicalPeriodSchema)
    .min(1, 'At least one historical revenue period is required'),
  projectedGrowthRatePercent: z.number().min(-100).max(1000).default(5),
  projectionPeriodsCount: z.number().int().min(1).max(24).default(4),
  participants: z.array(simulationParticipantSchema).min(1, 'At least one participant required'),
  currency: z.string().length(3).toUpperCase().default('USD'),
});

export type SimulationParticipantInput = z.infer<typeof simulationParticipantSchema>;
export type SimulateRoyaltyInput = z.infer<typeof simulateRoyaltySchema>;
export type SaveSimulationInput = z.infer<typeof saveSimulationSchema>;
export type HistoricalPeriodInput = z.infer<typeof historicalPeriodSchema>;
export type ForecastEarningsInput = z.infer<typeof forecastEarningsSchema>;
