import { ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import type { AgentDecision } from '../types';
import { getSessionWalletState } from '../services/sessionWallet';
import { useEffect, useState } from 'react';

interface Props {
  decisions: AgentDecision[];
}

export function AgentActivityLog({ decisions }: Props) {
  const [walletState, setWalletState] = useState(getSessionWalletState());

  // Update wallet state every second to keep balance fresh
  useEffect(() => {
    const interval = setInterval(() => {
      setWalletState(getSessionWalletState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="neu-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div className="neu-icon-wrapper" style={{ padding: '8px' }}>
          <Zap size={20} color="var(--accent)" />
        </div>
        <h3 className="neu-heading" style={{ fontSize: '1.25rem', margin: 0 }}>IronIQ Agent</h3>
      </div>

      <div className="neu-inset" style={{ padding: '16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Session Wallet Balance</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
            {walletState.balance.toFixed(2)} USDC
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Spent</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {walletState.spent.toFixed(2)} USDC
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {decisions.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '12px', padding: '20px', textAlign: 'center' }}>
            <ShieldAlert size={32} style={{ opacity: 0.5 }} />
            <p style={{ fontSize: '0.9rem', margin: 0 }}>
              Agent is monitoring your form. It will autonomously purchase guidance if you struggle.
            </p>
          </div>
        ) : (
          decisions.map((decision) => (
            <div key={decision.id} className="neu-inset animate-fade-up" style={{ padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} color="var(--accent)" />
                  {decision.action === 'text-guidance' ? 'Text Guidance' : 'Voice Guidance'}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>
                  -{decision.amount} USDC
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                Reason: {decision.reason}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                TX: {decision.transactionId}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
