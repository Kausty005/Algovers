import { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Loader,
  Copy,
  Wallet,
} from 'lucide-react';
import { useWallet } from '@txnlab/use-wallet-react';
import type { PaymentStatus, PaymentSessionResponse } from '../types';

interface Props {
  open: boolean;
  status: PaymentStatus;
  session: PaymentSessionResponse | null;
  error: string | null;
  setError: (msg: string) => void;
  onClose: () => void;
  onConfirmPayment: () => void;
}

function StatusIcon({ status }: { status: PaymentStatus }) {
  if (status === 'processing') return <Loader size={48} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />;
  if (status === 'verified') return <CheckCircle size={48} color="var(--success)" />;
  if (status === 'failed') return <XCircle size={48} color="var(--danger)" />;
  return <CreditCard size={48} color="var(--accent)" />;
}

function statusLabel(s: PaymentStatus) {
  switch (s) {
    case 'idle': return 'Preparing...';
    case 'required': return 'Payment Required';
    case 'processing': return 'Verifying Payment...';
    case 'verified': return 'Payment Verified ✓';
    case 'failed': return 'Payment Failed';
  }
}

export function PaymentModal({ open, status, session, error, setError, onClose, onConfirmPayment }: Props) {
  const [copied, setCopied] = useState(false);
  const { activeAccount, wallets } = useWallet();

  if (!open) return null;

  const copyAddress = () => {
    if (session?.paymentAddress) {
      navigator.clipboard.writeText(session.paymentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getNetworkName = (network: string) => {
    if (network.includes('SGO1GKSzyE') || network === 'testnet') return 'Algorand TestNet';
    return network;
  }

  const getAssetName = (asset: string) => {
    if (asset === '10458941') return 'USDC';
    return asset;
  }

  return (
    /* Backdrop */
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
      {/* Modal card */}
      <div
        className="neu-raised-lg animate-fade-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          animationDelay: '0.05s',
          animationFillMode: 'both',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            className="neu-circle"
            style={{ width: 80, height: 80, margin: '0 auto 16px' }}
          >
            <StatusIcon status={status} />
          </div>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {statusLabel(status)}
          </h2>
          {status === 'required' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '8px' }}>
              A one-time payment unlocks your full workout session with AI coaching.
            </p>
          )}
        </div>

        {/* Payment details */}
        {session && status === 'required' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Info rows */}
            {[
              { label: 'Service', value: 'AI Workout Session' },
              { label: 'Network', value: getNetworkName(session.network) },
              { label: 'Asset', value: getAssetName(session.asset) },
              { label: 'Price', value: `${session.amount} ${getAssetName(session.asset)}` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="neu-inset"
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderRadius: '10px',
                }}
              >
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, minWidth: '60px' }}>{label}</span>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{value}</span>
              </div>
            ))}

            {/* Address copy */}
            <div
              className="neu-inset"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Payment Address (Receiver)
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {session.paymentAddress}
                </span>
                <button className="neu-btn" style={{ padding: '6px', borderRadius: '8px', flexShrink: 0 }} onClick={copyAddress}>
                  <Copy size={14} color={copied ? 'var(--success)' : 'var(--text-secondary)'} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="neu-inset"
            style={{ padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '10px' }}
          >
            <XCircle size={18} color="var(--danger)" />
            <span style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {/* Verified message */}
        {status === 'verified' && (
          <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
            Your workout session is now unlocked. Starting camera…
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          {status === 'required' && !activeAccount && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Connect Wallet to Pay</p>
              {wallets?.map((wallet: any) => {
                const walletName = wallet.metadata?.name || wallet.name || wallet.id;
                return (
                  <button
                    key={wallet.id}
                    className="neu-btn"
                    style={{ padding: '12px 24px', fontSize: '0.95rem', width: '100%' }}
                    onClick={() => {
                      console.log('--- WALLET CONNECT DIAGNOSTICS ---');
                      console.log('wallet.id:', wallet.id);
                      console.log('wallet.metadata:', wallet.metadata);
                      console.log('wallet.isReady:', wallet.isReady);
                      console.log('wallet.isConnected:', wallet.isConnected);
                      console.log('----------------------------------');
                      wallet.connect().catch((err: any) => {
                        console.error('--- WALLET CONNECT ERROR DIAGNOSTICS ---');
                        console.error('Complete error object:', err);
                        console.error('error.name:', err?.name);
                        console.error('error.message:', err?.message);
                        console.error('error.stack:', err?.stack);
                        console.error('----------------------------------------');
                        
                        const msg = err?.message?.toLowerCase() || String(err).toLowerCase();
                        if (msg.includes('not found') || msg.includes('not installed') || msg.includes('not available') || msg.includes('not defined')) {
                          setError(`${walletName} not detected. Please install it.`);
                        } else {
                          setError(`Connection to ${walletName} failed or was rejected.`);
                        }
                      });
                    }}
                  >
                    Connect {walletName}
                  </button>
                );
              })}
            </div>
          )}

          {status === 'required' && activeAccount && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '4px' }}>Wallet Connected</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Address:</div>
                <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '6px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeAccount.address}
                </div>
              </div>
              <button
                className="neu-btn-accent neu-btn"
                style={{ padding: '14px 24px', fontSize: '1rem', width: '100%' }}
                onClick={onConfirmPayment}
              >
                <Wallet size={20} />
                Pay {session?.amount} {getAssetName(session?.asset || '')}
              </button>
            </div>
          )}

          {status !== 'verified' && (
            <button
              className="neu-btn"
              style={{ padding: '12px 24px', width: '100%', color: 'var(--text-secondary)' }}
              onClick={onClose}
            >
              Cancel
            </button>
          )}

          {status === 'verified' && (
            <button
              className="neu-btn-accent neu-btn"
              style={{ padding: '14px 24px', fontSize: '1rem', width: '100%' }}
              onClick={onClose}
            >
              <CheckCircle size={20} />
              Start Workout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
