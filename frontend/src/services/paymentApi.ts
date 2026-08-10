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
      // Try header-based x402 format first (real x402-avm middleware), then fall back to JSON body (demo middleware)
      const paymentRequiredHeader = response.headers.get('PAYMENT-REQUIRED');
      let data: any;
      if (paymentRequiredHeader) {
        data = JSON.parse(atob(paymentRequiredHeader));
      } else {
        data = await response.json();
      }

      const accept = data.accepts?.[0];
      if (!accept) throw new Error('Invalid 402 response: no payment options found');

      // Normalise field names — real x402 uses `amount`, demo uses `maxAmountRequired`
      const rawAmount: string = accept.amount ?? accept.maxAmountRequired ?? '0';

      // Format amount based on decimals
      let displayAmount = rawAmount;
      if (accept.extra?.decimals) {
        displayAmount = (parseInt(rawAmount, 10) / Math.pow(10, accept.extra.decimals)).toString();
      } else if (accept.asset === '10458941' || accept.asset === '31566704') {
        // USDC / TestNet USDC — 6 decimals
        displayAmount = (parseInt(rawAmount, 10) / 1_000_000).toString();
      }

      return {
        sessionId: 'pending',
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

  buyAiCredits: async (tier: 'basic' | 'pro' | 'expert', sessionId: string, txId?: string): Promise<any> => {
    const url = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'}/api/payment/ai-credits/${tier}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (txId) {
      headers['X-PAYMENT'] = txId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sessionId }),
    });

    if (response.status === 402) {
      const data = await response.json();
      const accept = data.accepts[0];
      return {
        paymentAddress: accept.payTo,
        amount: accept.maxAmountRequired,
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
  buyAiCredits: async (tier: 'basic' | 'pro' | 'expert', sessionId: string, txId?: string): Promise<any> => {
    if (!txId) {
      return {
        paymentAddress: 'MOCK_ALGORAND_ADDRESS_00000000000000000000000000',
        amount: tier === 'basic' ? '0.05' : tier === 'pro' ? '0.1' : '0.25',
        asset: 'ALGO',
        network: 'algorand-testnet',
        status: 'required',
      };
    }
    return {
      sessionId,
      credits: 10,
      model: tier === 'basic' ? 'gemini-1.5-flash-8b' : tier === 'pro' ? 'gemini-1.5-flash' : 'gemini-1.5-pro',
      tier,
      status: 'verified'
    };
  }
};
