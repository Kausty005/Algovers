import type {
  PaymentSessionResponse,
  ExerciseType,
  PaymentStatusResponse,
} from '../types';

export const paymentApi = {
  createSession: async (exercise: ExerciseType, txId?: string): Promise<PaymentSessionResponse> => {
    const url = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/payment/session`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (txId) {
      headers['X-PAYMENT'] = txId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ exercise }),
    });

    if (response.status === 402) {
      const paymentRequiredHeader = response.headers.get('PAYMENT-REQUIRED');
      if (!paymentRequiredHeader) {
        throw new Error('Missing PAYMENT-REQUIRED header in 402 response');
      }
      
      const decodedHeader = atob(paymentRequiredHeader);
      const data = JSON.parse(decodedHeader);
      const accept = data.accepts[0];
      
      // format amount based on decimals
      let displayAmount = accept.amount;
      if (accept.extra?.decimals) {
         const decimals = accept.extra.decimals;
         displayAmount = (parseInt(accept.amount, 10) / Math.pow(10, decimals)).toString();
      } else if (accept.asset === '10458941' || accept.asset === '31566704') {
         // USDC has 6 decimals
         displayAmount = (parseInt(accept.amount, 10) / 1000000).toString();
      }
      return {
        sessionId: 'pending', // Awaiting verification to get real session ID
        paymentAddress: accept.payTo,
        amount: displayAmount,
        asset: accept.asset,
        network: accept.network,
        status: 'required',
      };
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    return response.json();
  },
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
