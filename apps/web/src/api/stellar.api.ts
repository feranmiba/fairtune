import { api } from './client';
import {
  PrepareCreateAgreementTxInput,
  PrepareApproveAgreementTxInput,
  PrepareDepositEscrowTxInput,
  PrepareDistributeRoyaltiesTxInput,
  SubmitSignedTxInput,
} from '@fairtune/validation';

export interface PreparedTxResponse {
  unsignedXdr: string;
  transactionHash: string;
  sourceAccount: string;
  networkPassphrase: string;
  memo?: string;
  estimatedFeeStroops?: string;
  contractAddress?: string;
}

export interface SubmittedTxResult {
  successful: boolean;
  ledger: number;
  hash: string;
  envelopeXdr: string;
  resultXdr: string;
  returnValue?: unknown;
}

export interface NetworkStatus {
  passphrase: string;
  rpcUrl: string;
  connectivity: boolean;
  soroban?: {
    contractId?: string;
    network?: string;
  };
}

export interface AccountBalance {
  asset: string;
  balance: string;
  limit?: string;
}

export const stellarApi = {
  getNetworkStatus: async (): Promise<NetworkStatus> => {
    return api.get<NetworkStatus>('/stellar/network', {}, false);
  },

  verifyAccount: async (
    address: string,
  ): Promise<{ validFormat: boolean; funded: boolean; message?: string }> => {
    return api.get(`/stellar/accounts/${address}/verify`);
  },

  getBalances: async (
    address: string,
  ): Promise<{ balances: AccountBalance[]; sequence: string }> => {
    return api.get(`/stellar/accounts/${address}/balances`);
  },

  generateTestnetAccount: async (): Promise<{
    publicKey: string;
    secretKey?: string;
    network: string;
    message?: string;
  }> => {
    return api.post('/stellar/accounts/generate-testnet');
  },

  prepareCreateAgreementTx: async (
    input: PrepareCreateAgreementTxInput,
  ): Promise<PreparedTxResponse> => {
    return api.post<PreparedTxResponse>('/stellar/agreements/register/prepare', input);
  },

  prepareApproveAgreementTx: async (
    agreementId: string,
    input: PrepareApproveAgreementTxInput,
  ): Promise<PreparedTxResponse> => {
    return api.post<PreparedTxResponse>(
      `/stellar/agreements/${agreementId}/approve/prepare`,
      input,
    );
  },

  prepareDepositEscrowTx: async (
    agreementId: string,
    input: PrepareDepositEscrowTxInput,
  ): Promise<PreparedTxResponse> => {
    return api.post<PreparedTxResponse>(
      `/stellar/agreements/${agreementId}/deposit/prepare`,
      input,
    );
  },

  prepareDistributeRoyaltiesTx: async (
    agreementId: string,
    input: PrepareDistributeRoyaltiesTxInput,
  ): Promise<PreparedTxResponse> => {
    return api.post<PreparedTxResponse>(
      `/stellar/agreements/${agreementId}/distribute/prepare`,
      input,
    );
  },

  submitSignedTx: async (input: SubmitSignedTxInput): Promise<SubmittedTxResult> => {
    return api.post<SubmittedTxResult>('/stellar/transactions/submit', input);
  },

  getHistory: async (): Promise<
    Array<{
      id: string;
      hash: string;
      type: string;
      status: string;
      sourceAccount: string;
      createdAt: string;
    }>
  > => {
    return api.get('/stellar/transactions/history');
  },
};
