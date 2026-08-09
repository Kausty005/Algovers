import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  count: number;
  exercise: string;
  repCompleted?: boolean;
}

export function RepCounter({ count, exercise, repCompleted }: Props) {
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (repCompleted && countRef.current) {
      countRef.current.classList.remove('animate-rep-pop');
      // Trigger reflow
      void countRef.current.offsetWidth;
      countRef.current.classList.add('animate-rep-pop');
    }
  }, [count, repCompleted]);

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}
      >
        <RotateCcw size={16} color="var(--accent)" />
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Reps
        </span>
      </div>

      {/* Big rep number */}
      <div
        className="neu-circle"
        style={{ width: 96, height: 96 }}
      >
        <span
          ref={countRef}
          style={{
            fontSize: '2.5rem',
            fontWeight: 900,
            color: 'var(--accent)',
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      </div>

      <span
        style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          textTransform: 'capitalize',
        }}
      >
        {exercise.replace('_', ' ')}
      </span>
    </div>
  );
}
