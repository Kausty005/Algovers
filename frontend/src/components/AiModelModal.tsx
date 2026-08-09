import { useState } from 'react';
import { Bot, Zap, Star, Shield, Loader, CheckCircle, Wallet, XCircle, X } from 'lucide-react';

interface Tier {
  id: 'basic' | 'pro' | 'expert';
  name: string;
  icon: React.ReactNode;
  price: string;
  desc: string;
}

const TIERS: Tier[] = [
  { id: 'basic', name: 'Basic Coach', icon: <Bot size={24} />, price: '0.05 ALGO', desc: 'Fast, standard fitness advice.' },
  { id: 'pro', name: 'Pro Coach', icon: <Zap size={24} />, price: '0.10 ALGO', desc: 'Better reasoning and detailed plans.' },
  { id: 'expert', name: 'Expert Coach', icon: <Star size={24} />, price: '0.25 ALGO', desc: 'Highly detailed fitness analysis.' },
];

interface Props {
  open: boolean;
  status: 'idle' | 'required' | 'processing' | 'verified' | 'failed';
  error: string | null;
  onSelectTier: (tier: 'basic' | 'pro' | 'expert') => void;
  onClose: () => void;
  onConfirmPayment: () => void;
}

export function AiModelModal({ open, status, error, onSelectTier, onClose, onConfirmPayment }: Props) {
  const [selected, setSelected] = useState<'basic' | 'pro' | 'expert'>('pro');

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
              Buy 10 credits to chat with IronIQ. Choose your intelligence level.
            </p>
          )}
        </div>

        {(status === 'idle' || status === 'failed' || status === 'required') && (
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
            <span style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</span>
          </div>
        )}

        {status === 'verified' && (
          <div style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
            Credits added successfully! You can now chat.
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          {(status === 'idle' || status === 'failed') && (
            <button
              className="neu-btn-accent neu-btn"
              style={{ padding: '14px 24px', fontSize: '1rem', width: '100%' }}
              onClick={() => onSelectTier(selected)}
            >
              Purchase 10 Credits
            </button>
          )}

          {status === 'required' && (
            <button
              className="neu-btn-accent neu-btn"
              style={{ padding: '14px 24px', fontSize: '1rem', width: '100%' }}
              onClick={onConfirmPayment}
            >
              <Wallet size={20} />
              I've Sent the Payment
            </button>
          )}

          {status === 'verified' && (
            <button
              className="neu-btn-accent neu-btn"
              style={{ padding: '14px 24px', fontSize: '1rem', width: '100%' }}
              onClick={onClose}
            >
              <CheckCircle size={20} />
              Start Chatting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
