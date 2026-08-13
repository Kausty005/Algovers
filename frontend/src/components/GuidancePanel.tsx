import { Lightbulb, AlertTriangle, CheckCircle, Lock, Zap } from 'lucide-react';

interface Props {
  message: string;
  priority?: 'low' | 'medium' | 'high';
  loading?: boolean;
  locked?: boolean;
  agentPurchased?: boolean;
}

const PRIORITY_CONFIG = {
  low: { icon: CheckCircle, color: 'var(--success)', label: 'Good' },
  medium: { icon: Lightbulb, color: 'var(--info)', label: 'Tip' },
  high: { icon: AlertTriangle, color: 'var(--warning)', label: 'Fix' },
};

export function GuidancePanel({ message, priority = 'medium', loading, locked, agentPurchased }: Props) {
  if (locked) {
    return (
      <div className="neu-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(25, 25, 28, 0.8)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div className="neu-icon-wrapper" style={{ padding: '16px', borderRadius: '50%' }}>
            <Lock size={32} color="var(--text-secondary)" />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, margin: 0 }}>Agent will unlock if needed</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', opacity: 0.3 }}>
          <div className="neu-icon-wrapper" style={{ padding: '8px' }}>
            <Zap size={20} color="var(--accent)" />
          </div>
          <h3 className="neu-heading" style={{ fontSize: '1.25rem', margin: 0 }}>Live AI Coach</h3>
        </div>
        <div className="neu-inset" style={{ flex: 1, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
          <p style={{ color: 'var(--text-secondary)' }}>Guidance Locked</p>
        </div>
      </div>
    );
  }

  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <div
      className={`neu-raised ${agentPurchased ? 'animate-glow' : ''}`}
      style={{
        padding: '20px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        minHeight: '90px',
        position: 'relative'
      }}
    >
      {agentPurchased && (
        <div style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: 'var(--accent)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(235, 87, 87, 0.3)', zIndex: 10 }}>
          <Zap size={14} /> Agent Unlocked
        </div>
      )}
      <div
        className="neu-circle"
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          boxShadow: `4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light), 0 0 10px ${config.color}40`,
        }}
      >
        <Icon size={22} color={config.color} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: config.color,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            AI Guidance — {config.label}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="neu-spinner" style={{ width: 16, height: 16, borderWidth: '2px' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Analyzing your form…
            </span>
          </div>
        ) : (
          <p
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
            className="animate-fade-in"
          >
            {message || 'Keep going! Waiting for data…'}
          </p>
        )}
      </div>
    </div>
  );
}
