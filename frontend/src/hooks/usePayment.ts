import { useState, useCallback } from 'react';
import type { PaymentStatus, PaymentSessionResponse, ExerciseType } from '../types';
import { paymentApi, mockPaymentApi } from '../services/paymentApi';

const IS_MOCK = import.meta.env.VITE_API_BASE_URL === undefined;
const api = IS_MOCK ? mockPaymentApi : paymentApi;

export function usePayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [session, setSession] = useState<PaymentSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initPayment = useCallback(async (exercise: ExerciseType) => {
    setStatus('required');
    setError(null);
    try {
      const s = await api.createSession(exercise);
      setSession(s);
      setStatus('required');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment init failed');
      setStatus('failed');
    }
  }, []);

  const pollStatus = useCallback(async () => {
    if (!session) return;
    setStatus('processing');
    try {
      const res = await paymentApi.getStatus();
      setStatus(res.status);
    } catch {
      setStatus('failed');
      setError('Could not verify payment. Please try again.');
    }
  }, [session]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSession(null);
    setError(null);
  }, []);

  return { status, session, error, initPayment, pollStatus, reset };
}
