import { apiFetch } from './api';
import type {
  PaymentStatusResponse,
  PaymentSessionRequest,
  PaymentSessionResponse,
  ExerciseType,
} from '../types';

export const paymentApi = {
  getStatus: (): Promise<PaymentStatusResponse> =>
    apiFetch<PaymentStatusResponse>('/api/payment/status'),

  createSession: (exercise: ExerciseType): Promise<PaymentSessionResponse> =>
    apiFetch<PaymentSessionResponse>('/api/payment/session', {
      method: 'POST',
      body: JSON.stringify({ exercise } as PaymentSessionRequest),
    }),
};

// ─── MOCK (DEV ONLY) ─────────────────────────────────────────────
export const mockPaymentApi = {
  getStatus: async (): Promise<PaymentStatusResponse> => ({
    status: 'required',
    network: 'algorand-testnet',
    price: '0.1 ALGO',
    asset: 'ALGO',
    receiverAddress: 'MOCK_RECEIVER_ADDRESS_000000000000000000000',
  }),
  createSession: async (_exercise: ExerciseType): Promise<PaymentSessionResponse> => ({
    sessionId: `pay-mock-${Date.now()}`,
    paymentAddress: 'MOCK_ALGORAND_ADDRESS_00000000000000000000000000',
    amount: '0.1',
    asset: 'ALGO',
    network: 'algorand-testnet',
    status: 'required',
  }),
};
