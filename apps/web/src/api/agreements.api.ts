import { api } from './client';
import { CreateRoyaltyAgreementInput } from '@fairtune/validation';
import { RoyaltyAgreementDto, CollaboratorDto } from '@fairtune/shared';

export interface AgreementWithCollaborators extends RoyaltyAgreementDto {
  collaborators: CollaboratorDto[];
  onChainAgreementId?: string | null;
  paymentTokenAddress?: string | null;
  payments?: Array<{
    id: string;
    amount: string | number;
    amountSubunits: string;
    status: string;
    recipientAddress: string;
    transactionHash?: string | null;
    createdAt: string;
    confirmedAt?: string | null;
    asset?: {
      code: string;
      name: string;
    };
    collaborator?: {
      displayName: string;
    };
  }>;
  artist?: {
    id: string;
    stageName: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export const agreementsApi = {
  create: async (input: CreateRoyaltyAgreementInput): Promise<AgreementWithCollaborators> => {
    return api.post<AgreementWithCollaborators>('/royalty-agreements', input);
  },

  list: async (): Promise<AgreementWithCollaborators[]> => {
    return api.get<AgreementWithCollaborators[]>('/royalty-agreements');
  },

  getById: async (id: string): Promise<AgreementWithCollaborators> => {
    return api.get<AgreementWithCollaborators>(`/royalty-agreements/${id}`);
  },

  submit: async (id: string): Promise<AgreementWithCollaborators> => {
    return api.post<AgreementWithCollaborators>(`/royalty-agreements/${id}/submit`);
  },

  approve: async (id: string, notes?: string): Promise<AgreementWithCollaborators> => {
    return api.post<AgreementWithCollaborators>(`/royalty-agreements/${id}/approve`, { notes });
  },

  activate: async (id: string): Promise<AgreementWithCollaborators> => {
    return api.post<AgreementWithCollaborators>(`/royalty-agreements/${id}/activate`);
  },

  cancel: async (id: string, reason?: string): Promise<AgreementWithCollaborators> => {
    return api.post<AgreementWithCollaborators>(`/royalty-agreements/${id}/cancel`, { reason });
  },

  deposit: async (
    id: string,
    data: { amount: string; asset?: string },
  ): Promise<{ success: boolean; message: string; transactionHash: string }> => {
    return api.post(`/royalty-agreements/${id}/deposit`, data);
  },

  distribute: async (
    id: string,
    data?: { amount?: string },
  ): Promise<{ success: boolean; message: string }> => {
    return api.post(`/royalty-agreements/${id}/distribute`, data || {});
  },
};
