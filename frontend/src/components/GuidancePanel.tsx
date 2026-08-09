import { Lightbulb, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  message: string;
  priority?: 'low' | 'medium' | 'high';
  loading?: boolean;
}

const PRIORITY_CONFIG = {
  low: { icon: CheckCircle, color: 'var(--success)', label: 'Good' },
  medium: { icon: Lightbulb, color: 'var(--info)', label: 'Tip' },
  high: { icon: AlertTriangle, color: 'var(--warning)', label: 'Fix' },
};

export function GuidancePanel({ message, priority = 'medium', loading }: Props) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <div
      className="neu-raised"
      style={{
        padding: '20px',
        display: 'flex',
        gap: '14px',
        alignItems: 'flex-start',
        minHeight: '90px',
      }}
    >
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
