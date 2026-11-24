import { Module } from '@nestjs/common';
import { RoyaltyIntelligenceService } from './royalty-intelligence.service';
import { RoyaltyIntelligenceController } from './royalty-intelligence.controller';
import { RoyaltyAnalyticsService } from './services/royalty-analytics.service';
import { RoyaltyForecastingService } from './services/royalty-forecasting.service';
import { AnomalyDetectionService } from './services/anomaly-detection.service';
import { AnomalyReviewService } from './services/anomaly-review.service';

@Module({
  controllers: [RoyaltyIntelligenceController],
  providers: [
    RoyaltyIntelligenceService,
    RoyaltyAnalyticsService,
    RoyaltyForecastingService,
    AnomalyDetectionService,
    AnomalyReviewService,
  ],
  exports: [
    RoyaltyIntelligenceService,
    RoyaltyAnalyticsService,
    RoyaltyForecastingService,
    AnomalyDetectionService,
    AnomalyReviewService,
  ],
})
export class RoyaltyIntelligenceModule {}
