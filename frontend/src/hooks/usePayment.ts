import { useState, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { ExactAvmScheme, ALGORAND_TESTNET_CAIP2 } from '@x402/avm';
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
    setStatus('processing');
    setError(null);

    // ── Dev bypass: skip wallet signing entirely ─────────────────
    const bypass = import.meta.env.VITE_BYPASS_PAYMENT === 'true';
    if (bypass) {
      try {
        const url = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/payment/session`;
        const token = localStorage.getItem('token');
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ exercise: currentExercise }),
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setSession(data);
        setStatus('verified');
      } catch (err: any) {
        setStatus('failed');
        setError(`Payment bypass failed: ${err?.message ?? err}`);
      }
      return;
    }

    if (!activeAccount) {
      setError('Please connect an Algorand wallet first.');
      setStatus('failed');
      return;
    }

    try {
      // 1. Setup the x402 client with the wallet signer
      const signer = {
        address: activeAccount.address,
        signTransactions: async (txns: Uint8Array[], indexesToSign: number[]) => {
          return await signTransactions(txns, indexesToSign);
        }
      };

      const client = new x402Client().register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));
      const fetchWithPayment = wrapFetchWithPayment(window.fetch, client);

      // 2. Retry the request with the payment wrapper (include JWT so @jwt_required passes)
      const url = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/payment/session`;
      const token = localStorage.getItem('token');
      const response = await fetchWithPayment(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ exercise: currentExercise }),
      });

      if (!response.ok) {
        throw new Error(`Payment failed or server error: ${response.status}`);
      }

      const data = await response.json();
      setSession(data);
      setStatus('verified');

    } catch (err: any) {
      console.error('[usePayment] confirmPayment error:', err);
      setStatus('failed');

      const errMsg = err?.message || String(err);
      if (errMsg.includes('rejected') || errMsg.includes('cancel')) {
        setError('Transaction rejected by user.');
      } else if (errMsg.includes('Insufficient funds') || errMsg.includes('below minimum')) {
        setError('Insufficient ALGO balance for transaction fees.');
      } else if (errMsg.includes('asset') && errMsg.includes('balance')) {
        setError('Insufficient USDC balance to complete payment.');
      } else if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('missing authorization')) {
        setError('Session expired. Please log out and log in again.');
      } else if (errMsg.includes('wallet') || errMsg.includes('connect')) {
        setError('Wallet not connected. Please connect your Algorand wallet.');
      } else {
        setError(`Payment failed: ${errMsg}`);
      }
    }
  }, [activeAccount, currentExercise, signTransactions]);

  const reset = useCallback(() => {
    setStatus('idle');
    setSession(null);
    setError(null);
  }, []);

  return { status, session, error, setError, initPayment, confirmPayment, reset };
}
