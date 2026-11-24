import { api } from './client';
import { PaymentDto, PaymentAssetDto } from '@fairtune/shared';

export interface PaymentsResponse {
  payments: Array<
    PaymentDto & {
      asset: PaymentAssetDto;
      agreement?: {
        title: string;
        contractAddress?: string | null;
      };
    }
  >;
  total: number;
}

export const paymentsApi = {
  getAssets: async (): Promise<PaymentAssetDto[]> => {
    return api.get<PaymentAssetDto[]>('/payments/assets');
  },

  list: async (params?: {
    agreementId?: string;
    status?: string;
  }): Promise<{
    payments: Array<
      PaymentDto & {
        asset: PaymentAssetDto;
        agreement?: {
          title: string;
          contractAddress?: string | null;
        };
      }
    >;
    total: number;
  }> => {
    const search = new URLSearchParams();
    if (params?.agreementId) search.set('agreementId', params.agreementId);
    if (params?.status) search.set('status', params.status);
    const query = search.toString() ? `?${search.toString()}` : '';
    const res = await api.get<any>(`/payments${query}`);
    const payments = Array.isArray(res) ? res : res?.items || res?.payments || [];
    const total = typeof res?.total === 'number' ? res.total : payments.length;
    return { payments, total };
  },

  getById: async (id: string): Promise<PaymentDto> => {
    return api.get<PaymentDto>(`/payments/${id}`);
  },
};
