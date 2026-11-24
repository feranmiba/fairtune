import { Test, TestingModule } from '@nestjs/testing';
import { RoyaltyForecastingService } from './royalty-forecasting.service';

describe('RoyaltyForecastingService', () => {
  let service: RoyaltyForecastingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoyaltyForecastingService],
    }).compile();

    service = module.get<RoyaltyForecastingService>(RoyaltyForecastingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateForecast', () => {
    it('should project future periods with isolated facts and mathematical forward estimates', () => {
      const forecast = service.generateForecast({
        title: 'Q1 Forecast',
        currency: 'USDC',
        projectedGrowthRatePercent: 10,
        projectionPeriodsCount: 3,
        historicalPeriods: [
          { period: '2026-01', actualGrossRevenue: 1000, actualRecouped: 100 },
          { period: '2026-02', actualGrossRevenue: 1200, actualRecouped: 100 },
          { period: '2026-03', actualGrossRevenue: 1400, actualRecouped: 100 },
        ],
        participants: [
          { collaboratorName: 'Alice', role: 'Vocalist', percentage: 70 },
          { collaboratorName: 'Bob', role: 'Producer', percentage: 30 },
        ],
      });

      expect(forecast.title).toBe('Q1 Forecast');
      expect(forecast.confidenceLevel).toBe('MEDIUM'); // 3 periods
      expect(forecast.historicalFacts.isHistoricalFact).toBe(true);
      expect(forecast.historicalFacts.totalHistoricalGrossRevenue).toBe(3600);

      expect(forecast.forwardEstimates.isHistoricalFact).toBe(false);
      expect(forecast.forwardEstimates.isModelProjection).toBe(true);
      expect(forecast.forwardEstimates.projectedPeriods).toHaveLength(3);
      expect(forecast.forwardEstimates.disclaimer).toContain('mathematical estimates');
    });

    it('should assign LOW confidence when fewer than 3 historical periods are available', () => {
      const forecast = service.generateForecast({
        currency: 'USDC',
        projectedGrowthRatePercent: 5,
        projectionPeriodsCount: 2,
        historicalPeriods: [{ period: '2026-01', actualGrossRevenue: 500, actualRecouped: 0 }],
        participants: [{ collaboratorName: 'Alice', role: 'Artist', percentage: 100 }],
      });

      expect(forecast.confidenceLevel).toBe('LOW');
      expect(forecast.confidenceScore).toBe(0.4);
    });
  });
});
