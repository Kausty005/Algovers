import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@txnlab/use-wallet-react';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactAvmScheme } from '@x402/avm/exact/client';
import type { ClientAvmSigner } from '@x402/avm';
import { Dumbbell, CreditCard, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PaymentGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [needsPayment, setNeedsPayment] = useState(true); // default to true to prevent premature bypass
  const [error, setError] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const { activeAccount, signTransactions, wallets } = useWallet();
  const navigate = useNavigate();

  // Try to access the protected route. If 402, show paywall. If 200, show children.
  const checkPayment = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/payment/check`;
      const token = localStorage.getItem('token');
      
      const bypass = import.meta.env.VITE_BYPASS_PAYMENT === 'true';
      if (bypass) {
        setNeedsPayment(false);
        setLoading(false);
        return;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (res.status === 402) {
        // Payment required
        const challenge = res.headers.get('www-authenticate') || '';
        const match = challenge.match(/exact-price="([^"]+)"/);
        if (match) setPaymentAmount(match[1]);
        setNeedsPayment(true);
      } else if (res.ok) {
        setNeedsPayment(false);
      } else {
        throw new Error(`Server error: ${res.status}`);
      }
    } catch (err: any) {
      console.error('Payment check failed:', err);
      setError(err?.message || 'Failed to check payment status. CORS issue or backend down?');
      setNeedsPayment(true); // Ensure paywall stays up if we can't verify
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPayment();
  }, [checkPayment]);

  const handlePay = async () => {
    if (!activeAccount) {
      setError('Please connect an Algorand wallet first.');
      return;
    }

    setPaying(true);
    setError(null);

    try {
      // 1. Setup the x402 client with the wallet signer (v2 API)
      const signer: ClientAvmSigner = {
        address: activeAccount.address,
        signTransactions: async (txns, indexes) => signTransactions(txns, indexes)
      };

      const client = new x402Client();
      // Register under BOTH variants — the server 402 sends the full genesis hash,
      // but the SDK may normalize to the truncated CAIP2 form internally.
      const scheme = new ExactAvmScheme(signer);
      const shortNet = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe';
      const fullNet  = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';
      client.register(shortNet, scheme);
      client.register(fullNet, scheme);
      const fetchWithPay = wrapFetchWithPayment(window.fetch, client);

      // 2. Retry the check request with the payment wrapper
      const url = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/payment/check`;
      const token = localStorage.getItem('token');
      
      const response = await fetchWithPay(url, {
        method: 'GET',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        // Payment successful!
        setNeedsPayment(false);
      } else {
        throw new Error(`Payment failed: ${response.status}`);
      }
    } catch (err: any) {
      console.error('Payment flow error:', err);
      setError(`Payment error: ${err?.message || String(err)}`);
    } finally {
      setPaying(false);
    }
  };

  const isPeraConnected = activeAccount?.providerId === 'pera';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader className="animate-spin" size={40} color="var(--accent)" />
      </div>
    );
  }

  if (needsPayment) {
    return (
      <div className="page-layout" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
        <div className="neu-panel" style={{ maxWidth: '400px', width: '100%', padding: '40px', textAlign: 'center' }}>
          <div className="neu-circle" style={{ width: 64, height: 64, margin: '0 auto 24px auto' }}>
            <Dumbbell size={32} color="var(--accent)" />
          </div>
          
          <h2 className="neu-heading" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
            Premium Workout Access
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.5 }}>
            You need an active session to access the AI coach. 
            Connect your wallet to pay {paymentAmount ? `${parseFloat(paymentAmount) / 1000000} USDC` : '0.01 USDC'} on Algorand TestNet.
          </p>

          {error && (
            <div style={{ 
              color: 'var(--danger)', 
              background: 'rgba(255,59,48,0.1)', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '24px',
              fontSize: '0.9rem',
              wordBreak: 'break-word'
            }}>
              {error}
            </div>
          )}

          {!activeAccount ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {wallets?.map((wallet) => (
                <button
                  key={wallet.id}
                  className="neu-btn"
                  style={{ padding: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={wallet.connect}
                >
                  <img src={wallet.metadata.icon} alt={wallet.metadata.name} style={{ width: 24, height: 24 }} />
                  Connect {wallet.metadata.name}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="neu-inset" style={{ padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                Connected: {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
              </div>
              <button
                className="neu-btn-accent neu-btn"
                style={{ padding: '16px', width: '100%' }}
                onClick={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    <CreditCard size={20} />
                    Pay {paymentAmount ? `${parseFloat(paymentAmount) / 1000000} USDC` : '0.01 USDC'}
                  </>
                )}
              </button>
              <button
                className="neu-btn"
                style={{ padding: '12px', width: '100%', fontSize: '0.9rem' }}
                onClick={() => {
                  wallets?.find(w => w.id === activeAccount.providerId)?.disconnect();
                }}
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
