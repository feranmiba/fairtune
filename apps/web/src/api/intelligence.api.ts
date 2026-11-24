import { api } from './client';
import {
  SimulateRoyaltyInput,
  SaveSimulationInput,
  ForecastEarningsInput,
  QueryAnomaliesInput,
  ReviewAnomalyInput,
} from '@fairtune/validation';
import { RoyaltyAnomalyDto, AnomalyReviewDto } from '@fairtune/shared';

export interface EarningsSummary {
  currency: string;
  totalHistoricalGross: number;
  totalHistoricalRecouped: number;
  totalHistoricalNetDistributed: number;
  byTrack: Array<{ trackTitle: string; agreementId: string; totalEarnings: number }>;
  byCollaborator: Array<{
    collaboratorName: string;
    stellarWalletAddress?: string;
    totalEarnings: number;
  }>;
  byAsset: Array<{ assetCode: string; totalAmount: number }>;
  byMonth: Array<{ month: string; gross: number; netDistributed: number }>;
}

export interface SimulationResult {
  title: string;
  currency: string;
  grossRevenue: number;
  recoupedExpenses: number;
  distributableRevenue: number;
  allocations: Array<{
    collaboratorName: string;
    role: string;
    percentage: number;
    amount: number;
  }>;
}

export interface ForecastResult {
  title: string;
  currency: string;
  generatedAt: string;
  confidenceScore: number;
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  historicalFacts: {
    isHistoricalFact: boolean;
    periodsAnalyzed: number;
    totalHistoricalGrossRevenue: number;
    totalHistoricalRecoupedExpenses: number;
    averageHistoricalGrossPerPeriod: number;
    participantHistoricalTotals: Array<{
      collaboratorName: string;
      role: string;
      percentage: number;
      totalHistoricalEarnings: number;
    }>;
    periods: Array<{
      period: string;
      grossRevenue: number;
      recoupedExpenses: number;
      netDistributable: number;
      participantDistributions: Array<{
        collaboratorName: string;
        role: string;
        percentage: number;
        actualEarnings: number;
      }>;
    }>;
  };
  forwardEstimates: {
    isHistoricalFact: boolean;
    isModelProjection: boolean;
    projectedGrowthRatePercent: number;
    projectionPeriodsCount: number;
    cumulativeProjectedGrossRevenue: number;
    participantProjectedTotals: Array<{
      collaboratorName: string;
      role: string;
      percentage: number;
      cumulativeProjectedEarnings: number;
    }>;
    projectedPeriods: Array<{
      projectionPeriodIndex: number;
      projectedGrossRevenue: number;
      participantSplits: Array<{
        collaboratorName: string;
        role: string;
        percentage: number;
        projectedShare: number;
      }>;
    }>;
    disclaimer: string;
  };
}

export interface AnomalyWithReview extends RoyaltyAnomalyDto {
  reviews?: AnomalyReviewDto[];
  agreement?: {
    title: string;
    contractAddress?: string | null;
  };
}

export const intelligenceApi = {
  getEarningsSummary: async (): Promise<EarningsSummary> => {
    return api.get<EarningsSummary>('/royalty-intelligence/earnings/summary');
  },

  getEarningsByTrack: async (): Promise<
    Array<{ trackTitle: string; agreementId: string; totalEarnings: number }>
  > => {
    return api.get('/royalty-intelligence/earnings/by-track');
  },

  getEarningsByCollaborator: async (): Promise<
    Array<{ collaboratorName: string; totalEarnings: number }>
  > => {
    return api.get('/royalty-intelligence/earnings/by-collaborator');
  },

  simulate: async (input: SimulateRoyaltyInput): Promise<SimulationResult> => {
    return api.post<SimulationResult>('/royalty-intelligence/simulate', input);
  },

  saveSimulation: async (input: SaveSimulationInput): Promise<{ id: string }> => {
    return api.post<{ id: string }>('/royalty-intelligence/simulate/save', input);
  },

  listSimulations: async (): Promise<
    Array<{ id: string; title: string; createdAt: string; input: SimulateRoyaltyInput }>
  > => {
    return api.get('/royalty-intelligence/simulations');
  },

  getSimulation: async (
    id: string,
  ): Promise<{
    id: string;
    title: string;
    input: SimulateRoyaltyInput;
    result: SimulationResult;
  }> => {
    return api.get(`/royalty-intelligence/simulations/${id}`);
  },

  forecast: async (input: ForecastEarningsInput): Promise<ForecastResult> => {
    return api.post<ForecastResult>('/royalty-intelligence/forecast', input);
  },

  detectAnomalies: async (agreementId: string): Promise<RoyaltyAnomalyDto[]> => {
    return api.post<RoyaltyAnomalyDto[]>(`/royalty-intelligence/anomalies/detect/${agreementId}`);
  },

  listAnomalies: async (
    params?: QueryAnomaliesInput,
  ): Promise<{ anomalies: AnomalyWithReview[]; total: number }> => {
    const search = new URLSearchParams();
    if (params?.agreementId) search.set('agreementId', params.agreementId);
    if (params?.severity) search.set('severity', params.severity);
    if (params?.reviewStatus) search.set('status', params.reviewStatus);
    const query = search.toString() ? `?${search.toString()}` : '';
    return api.get(`/royalty-intelligence/anomalies${query}`);
  },

  getAnomalyById: async (id: string): Promise<AnomalyWithReview> => {
    return api.get<AnomalyWithReview>(`/royalty-intelligence/anomalies/detail/${id}`);
  },

  reviewAnomaly: async (id: string, input: ReviewAnomalyInput): Promise<RoyaltyAnomalyDto> => {
    return api.post<RoyaltyAnomalyDto>(`/royalty-intelligence/anomalies/${id}/review`, input);
  },
};
