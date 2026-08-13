import { Volume2, VolumeX, Lock, Zap } from 'lucide-react';

interface Props {
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  audioUrl?: string;
  locked?: boolean;
  agentPurchased?: boolean;
}

export function VoiceIndicator({ active, muted, onToggleMute, audioUrl, locked, agentPurchased }: Props) {
  if (locked) {
    return (
      <div
        className="neu-panel"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(25, 25, 28, 0.8)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Lock size={16} color="var(--text-secondary)" />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, margin: 0, fontSize: '0.85rem' }}>Agent will unlock if needed</p>
        </div>
        
        {/* Animated bars (greyed out) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '28px', opacity: 0.3 }}>
          {[1, 2, 3, 4, 3].map((h, i) => (
            <div
              key={i}
              style={{
                width: '4px',
                height: '4px',
                background: 'var(--neu-shadow-dark)',
                borderRadius: '2px',
              }}
            />
          ))}
        </div>

        <div style={{ flex: 1, opacity: 0.3 }}>
          <p
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0
            }}
          >
            Voice Guidance Locked
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`neu-raised ${agentPurchased ? 'animate-glow' : ''}`}
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        position: 'relative'
      }}
    >
      {agentPurchased && (
        <div style={{ position: 'absolute', top: '-10px', right: '20px', backgroundColor: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(235, 87, 87, 0.3)', zIndex: 10 }}>
          <Zap size={10} /> Agent Unlocked
        </div>
      )}

      {/* Animated bars */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '28px' }}>
        {[1, 2, 3, 4, 3].map((h, i) => (
          <div
            key={i}
            style={{
              width: '4px',
              height: active && !muted ? `${h * 6}px` : '4px',
              background: active && !muted ? 'var(--accent)' : 'var(--neu-shadow-dark)',
              borderRadius: '2px',
              transition: 'height 0.15s ease',
              animation: active && !muted ? `pulse-dot ${0.6 + i * 0.1}s ease-in-out infinite alternate` : 'none',
            }}
          />
        ))}
      </div>

      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: active && !muted ? 'var(--accent)' : 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: 0
          }}
        >
          {muted ? 'Voice Muted' : active ? '🔊 AI Coach Active' : 'Voice Ready'}
        </p>
        {audioUrl && !muted && (
          <audio src={audioUrl} autoPlay hidden />
        )}
      </div>

      <button
        className="neu-btn"
        onClick={onToggleMute}
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          padding: 0,
        }}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <VolumeX size={18} color="var(--text-secondary)" />
        ) : (
          <Volume2 size={18} color="var(--accent)" />
        )}
      </button>
    </div>
  );
}
