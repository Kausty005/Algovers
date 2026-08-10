import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { ExerciseSelector } from '../components/ExerciseSelector';
import type { ExerciseType } from '../types';

export function ExercisePage() {
  const [selected, setSelected] = useState<ExerciseType | null>(null);
  const navigate = useNavigate();

  // Since payment is gated by PaymentGate, we can navigate directly
  const handleStart = useCallback(() => {
    if (!selected) return;
    navigate(`/workout/${selected}`);
  }, [selected, navigate]);

  return (
    <div className="page-layout">
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '640px' }}>
        <div style={{ marginBottom: '36px' }} className="animate-fade-up">
          <h1 className="neu-heading" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Choose Your Exercise
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Select the movement you want to train. Your AI coach will track your form and count your reps.
          </p>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <ExerciseSelector selected={selected} onSelect={setSelected} />
        </div>

        <div
          className="animate-fade-up"
          style={{ marginTop: '32px', animationDelay: '0.2s', animationFillMode: 'both' }}
        >
          {selected ? (
            <button
              className="neu-btn-accent neu-btn"
              style={{ padding: '16px 36px', fontSize: '1.05rem', width: '100%' }}
              onClick={handleStart}
            >
              Start {selected.replace('_', ' ')} Session
              <ChevronRight size={20} />
            </button>
          ) : (
            <div
              className="neu-inset"
              style={{ padding: '16px', borderRadius: '14px', textAlign: 'center' }}
            >
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Select an exercise above to continue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
