import { useState, useCallback } from 'react';
import type { PaymentStatus, PaymentSessionResponse, ExerciseType } from '../types';
import { paymentApi, mockPaymentApi } from '../services/paymentApi';

const api = paymentApi;

export function usePayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [session, setSession] = useState<PaymentSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<ExerciseType>('squat');

  const initPayment = useCallback(async (exercise: ExerciseType) => {
    setCurrentExercise(exercise);
    setStatus('required');
    setError(null);
    try {
      const s = await api.createSession(exercise);
      setSession(s);
      setStatus(s.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment init failed');
      setStatus('failed');
    }
  }, []);

  const pollStatus = useCallback(async () => {
    setStatus('processing');
    try {
      // In a real app we might poll the status API, but for x402 we retry the POST with the TX ID
      const s = await api.createSession(currentExercise, 'demo-verified-tx-123456789');
      setSession(s);
      setStatus(s.status);
    } catch (err) {
      setStatus('failed');
      setError('Could not verify payment. Please try again.');
    }
  }, [currentExercise]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSession(null);
    setError(null);
  }, []);

  return { status, session, error, initPayment, pollStatus, reset };
}
