import type { ExerciseType } from '../types';

interface Exercise {
  id: ExerciseType;
  label: string;
  emoji: string;
  muscles: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
}

const EXERCISES: Exercise[] = [
  {
    id: 'squat',
    label: 'Squat',
    emoji: '🏋️',
    muscles: ['Quads', 'Glutes', 'Hamstrings'],
    difficulty: 'Beginner',
    description: 'The king of lower body exercises. Build strong legs and glutes.',
  },
  {
    id: 'bicep_curl',
    label: 'Bicep Curl',
    emoji: '💪',
    muscles: ['Biceps', 'Forearms'],
    difficulty: 'Beginner',
    description: 'Isolate and build your biceps with controlled curling motion.',
  },
  {
    id: 'push_up',
    label: 'Push-Up',
    emoji: '🔥',
    muscles: ['Chest', 'Triceps', 'Shoulders'],
    difficulty: 'Intermediate',
    description: 'The classic bodyweight push for upper body strength.',
  },
];

const DIFF_COLOR: Record<string, string> = {
  Beginner: 'var(--success)',
  Intermediate: 'var(--warning)',
  Advanced: 'var(--danger)',
};

interface Props {
  selected: ExerciseType | null;
  onSelect: (e: ExerciseType) => void;
}

export function ExerciseSelector({ selected, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {EXERCISES.map((ex) => {
        const isSelected = selected === ex.id;
        return (
          <button
            key={ex.id}
            onClick={() => onSelect(ex.id)}
            className={isSelected ? 'neu-btn active' : 'neu-btn'}
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              textAlign: 'left',
              width: '100%',
              boxShadow: isSelected
                ? 'inset 4px 4px 8px var(--neu-shadow-dark), inset -4px -4px 8px var(--neu-shadow-light), 0 0 0 2px var(--accent)'
                : undefined,
            }}
          >
            {/* Emoji circle */}
            <div
              className="neu-circle"
              style={{
                width: 60,
                height: 60,
                fontSize: '1.8rem',
                flexShrink: 0,
              }}
            >
              {ex.emoji}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {ex.label}
                </span>
                <span
                  className="neu-badge"
                  style={{
                    background: `linear-gradient(135deg, ${DIFF_COLOR[ex.difficulty]}, ${DIFF_COLOR[ex.difficulty]}cc)`,
                    fontSize: '0.7rem',
                  }}
                >
                  {ex.difficulty}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>
                {ex.description}
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ex.muscles.map((m) => (
                  <span
                    key={m}
                    style={{
                      background: 'var(--neu-bg)',
                      boxShadow: '2px 2px 4px var(--neu-shadow-dark), -2px -2px 4px var(--neu-shadow-light)',
                      borderRadius: '20px',
                      padding: '2px 10px',
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 500,
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Selection indicator */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: isSelected ? 'linear-gradient(135deg, var(--accent), #8b85ff)' : 'var(--neu-bg)',
                boxShadow: isSelected
                  ? '0 0 10px var(--accent-glow)'
                  : '2px 2px 5px var(--neu-shadow-dark), -2px -2px 5px var(--neu-shadow-light)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l4 4 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
