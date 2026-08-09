import { Timer } from 'lucide-react';

interface Props {
  seconds: number;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function WorkoutTimer({ seconds }: Props) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div
      className="neu-raised"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Timer size={16} color="var(--accent)" />
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Duration
        </span>
      </div>

      <div
        className="neu-inset"
        style={{
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          borderRadius: '14px',
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', monospace",
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
          }}
        >
          {pad(mins)}
        </span>
        <span
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: 'var(--accent)',
            lineHeight: 1,
          }}
        >
          :
        </span>
        <span
          style={{
            fontFamily: "'Inter', monospace",
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '0.05em',
          }}
        >
          {pad(secs)}
        </span>
      </div>
    </div>
  );
}
