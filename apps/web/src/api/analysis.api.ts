import { api } from './client';
import { ContractAnalysisDto } from '@fairtune/shared';

export interface ContractClauseItem {
  id: string;
  documentId: string;
  category: string;
  title: string;
  text: string;
  pageNumber?: number | null;
  confidenceScore?: number | null;
}

export interface AnalysisSummaryWithClauses extends ContractAnalysisDto {
  clauses?: ContractClauseItem[];
  document?: {
    id: string;
    title: string;
    originalName: string;
    pageCount: number;
  };
}

export const analysisApi = {
  triggerAnalysis: async (documentId: string): Promise<ContractAnalysisDto> => {
    return api.post<ContractAnalysisDto>(`/contract-analysis/${documentId}`);
  },

  getByDocumentId: async (documentId: string): Promise<AnalysisSummaryWithClauses> => {
    return api.get<AnalysisSummaryWithClauses>(`/contract-analysis/document/${documentId}`);
  },

  getById: async (id: string): Promise<AnalysisSummaryWithClauses> => {
    return api.get<AnalysisSummaryWithClauses>(`/contract-analysis/${id}`);
  },

  getClauses: async (id: string): Promise<ContractClauseItem[]> => {
    return api.get<ContractClauseItem[]>(`/contract-analysis/${id}/clauses`);
  },
};
