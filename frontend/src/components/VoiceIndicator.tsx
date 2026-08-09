import { Volume2, VolumeX } from 'lucide-react';

interface Props {
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  audioUrl?: string;
}

export function VoiceIndicator({ active, muted, onToggleMute, audioUrl }: Props) {
  return (
    <div
      className="neu-raised"
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
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
          }}
        >
          {muted ? 'Voice Muted' : active ? '🔊 AI Coach Active' : 'Voice Ready'}
        </p>
        {audioUrl && (
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
