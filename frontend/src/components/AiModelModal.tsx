import { useState } from 'react';
import { Bot, Zap, Star, Shield, Loader, CheckCircle, Wallet, XCircle, X } from 'lucide-react';
import { useWallet } from '@txnlab/use-wallet-react';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactAvmScheme } from '@x402/avm/exact/client';
import type { ClientAvmSigner } from '@x402/avm';

interface Tier {
  id: 'basic' | 'pro' | 'expert';
  name: string;
  icon: React.ReactNode;
  price: string;
  desc: string;
}

const TIERS: Tier[] = [
  { id: 'basic', name: 'Basic Coach', icon: <Bot size={24} />, price: '0.05 USDC', desc: 'Fast, standard fitness advice.' },
  { id: 'pro', name: 'Pro Coach', icon: <Zap size={24} />, price: '0.10 USDC', desc: 'Better reasoning and detailed plans.' },
  { id: 'expert', name: 'Expert Coach', icon: <Star size={24} />, price: '0.25 USDC', desc: 'Highly detailed fitness analysis.' },
];

interface Props {
  open: boolean;
  sessionId: string;
  onClose: () => void;
  onSuccess: (credits: number) => void;
}

export function AiModelModal({ open, sessionId, onClose, onSuccess }: Props) {
  const [selected, setSelected] = useState<'basic' | 'pro' | 'expert'>('pro');
  const [status, setStatus] = useState<'idle' | 'processing' | 'verified' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { activeAccount, signTransactions, wallets } = useWallet();

  const handlePay = async () => {
    if (!activeAccount) {
      setError('Please connect an Algorand wallet first.');
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      // 1. Setup the x402 client with the wallet signer
      const signer: ClientAvmSigner = {
        address: activeAccount.address,
        signTransactions: async (txns, indexes) => signTransactions(txns, indexes)
      };

      const client = new x402Client();
      const scheme = new ExactAvmScheme(signer);
      const shortNet = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe';
      const fullNet  = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';
      client.registerV1(shortNet, scheme);
      client.registerV1(fullNet, scheme);
      client.register(shortNet, scheme);
      client.register(fullNet, scheme);
      
      const fetchWithPay = wrapFetchWithPayment(window.fetch, client);

      // 2. Make the payment-protected API call
      const url = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/payment/ai-credits/${selected}`;
      const token = localStorage.getItem('token');
      
      const response = await fetchWithPay(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus('verified');
        setTimeout(() => {
          onSuccess(data.credits);
        }, 1500);
      } else {
        const text = await response.text();
        throw new Error(text || `Payment failed: ${response.status}`);
      }
    } catch (err: any) {
      console.error('Payment flow error:', err);
      setStatus('failed');
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err, Object.getOwnPropertyNames(err));
      setError(`Payment error: ${errorStr}`);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(160,177,198,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      className="animate-fade-in"
    >
      <div
        className="neu-raised-lg animate-fade-up"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          position: 'relative',
        }}
      >
        {status === 'idle' || status === 'failed' ? (
          <button 
            className="neu-btn" 
            style={{ position: 'absolute', top: 20, right: 20, padding: 8, borderRadius: '50%' }}
            onClick={onClose}
          >
            <X size={20} color="var(--text-secondary)" />
          </button>
        ) : null}

        <div style={{ textAlign: 'center' }}>
          <div className="neu-circle" style={{ width: 64, height: 64, margin: '0 auto 16px' }}>
            {status === 'processing' ? <Loader size={32} className="animate-spin" color="var(--accent)" /> :
             status === 'verified' ? <CheckCircle size={32} color="var(--success)" /> :
             <Shield size={32} color="var(--accent)" />}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {status === 'processing' ? 'Verifying Payment...' : 
             status === 'verified' ? 'Payment Verified ✓' : 
             'Select AI Coach Tier'}
          </h2>
          {status !== 'verified' && status !== 'processing' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '8px' }}>
              Buy 10 credits to chat with IronIQ. Connect your wallet to pay via TestNet.
            </p>
          )}
        </div>

        {(status === 'idle' || status === 'failed') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TIERS.map((tier) => (
              <button
                key={tier.id}
                className={selected === tier.id ? "neu-inset" : "neu-btn"}
                onClick={() => setSelected(tier.id)}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'left',
                  border: selected === tier.id ? '2px solid var(--accent)' : '2px solid transparent',
                  width: '100%'
                }}
                disabled={status === 'processing' || status === 'verified'}
              >
                <div className="neu-circle" style={{ width: 48, height: 48, flexShrink: 0, color: selected === tier.id ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {tier.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tier.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{tier.desc}</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--accent)' }}>
                  {tier.price}
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="neu-inset" style={{ padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '10px' }}>
            <XCircle size={18} color="var(--danger)" />
            <span style={{ color: 'var(--danger)', fontSize: '0.875rem', wordBreak: 'break-word' }}>{error}</span>
          </div>
        )}

        {status === 'verified' && (
          <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
            Credits added successfully! Redirecting...
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          {(status === 'idle' || status === 'failed') && (
            !activeAccount ? (
              <>
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
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="neu-inset" style={{ padding: '12px', borderRadius: '12px', fontSize: '0.85rem', textAlign: 'center' }}>
                  Connected: {activeAccount.address.slice(0, 6)}...{activeAccount.address.slice(-4)}
                </div>
                <button
                  className="neu-btn-accent neu-btn"
                  style={{ padding: '14px 24px', fontSize: '1rem', width: '100%' }}
                  onClick={handlePay}
                  disabled={status === 'processing'}
                >
                  <Wallet size={20} />
                  Purchase 10 Credits
                </button>
                <button
                  className="neu-btn"
                  style={{ padding: '12px', width: '100%', fontSize: '0.9rem' }}
                  onClick={() => wallets?.find(w => w.id === activeAccount.providerId)?.disconnect()}
                >
                  Disconnect Wallet
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
