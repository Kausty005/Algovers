import { useState, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { x402Client } from '@x402/core';
import { wrapFetchWithPayment } from '@x402/fetch';
import { ExactAvmClient } from '@x402/avm';
import type { PaymentStatus, PaymentSessionResponse, ExerciseType } from '../types';
import { paymentApi } from '../services/paymentApi';

export function usePayment() {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [session, setSession] = useState<PaymentSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<ExerciseType>('squat');

  const { activeAccount, signTransactions } = useWallet();

  const initPayment = useCallback(async (exercise: ExerciseType) => {
    setCurrentExercise(exercise);
    setStatus('required');
    setError(null);
    try {
      const s = await paymentApi.createSession(exercise);
      setSession(s);
      setStatus(s.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment init failed');
      setStatus('failed');
    }
  }, []);

  const confirmPayment = useCallback(async () => {
    if (!activeAccount) {
      setError('Please connect an Algorand wallet first.');
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      // 1. Setup the x402 client with the wallet signer
      const signer = {
        address: activeAccount.address,
        signTransactions: async (txns: Uint8Array[], indexesToSign: number[]) => {
          return await signTransactions(txns, indexesToSign);
        }
      };

      const client = new x402Client().register('algorand:*', new ExactAvmClient(signer));
      const fetchWithPayment = wrapFetchWithPayment(window.fetch, client);

      // 2. Retry the request with the payment wrapper
      const url = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'}/api/payment/session`;
      const response = await fetchWithPayment(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: currentExercise }),
      });

      if (!response.ok) {
        throw new Error(`Payment failed or server error: ${response.status}`);
      }

      const data = await response.json();
      setSession(data);
      setStatus('verified');

    } catch (err) {
      console.error(err);
      setStatus('failed');
      setError('Payment verification or settlement failed. Please try again.');
    }
  }, [activeAccount, currentExercise, signTransactions]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSession(null);
    setError(null);
  }, []);

  return { status, session, error, initPayment, confirmPayment, reset };
}
