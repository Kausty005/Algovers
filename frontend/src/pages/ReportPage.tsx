import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Dumbbell, ChevronRight } from 'lucide-react';
import { ProgressReport } from '../components/ProgressReport';
import { workoutApi, mockWorkoutApi } from '../services/workoutApi';
import type { WorkoutReport } from '../types';

const isDev = import.meta.env.DEV;
const api = isDev ? mockWorkoutApi : workoutApi;

export function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await api.getReport(sessionId);
        if (!cancelled) setReport(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load report. Backend may be offline.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="page-layout">
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '680px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 className="neu-heading" style={{ fontSize: '2rem' }}>Session Report</h1>
          {sessionId && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', fontFamily: 'monospace' }}>
              {sessionId}
            </p>
          )}
        </div>

        {/* States */}
        {loading && (
          <div
            className="neu-raised"
            style={{
              padding: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div className="neu-circle" style={{ width: 72, height: 72 }}>
              <Loader size={32} color="var(--accent)" className="animate-spin" />
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading your workout report…</p>
          </div>
        )}

        {error && !loading && (
          <div
            className="neu-raised"
            style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
          >
            <div className="neu-circle" style={{ width: 72, height: 72 }}>
              <AlertCircle size={32} color="var(--danger)" />
            </div>
            <p style={{ color: 'var(--danger)', textAlign: 'center' }}>{error}</p>
            <button
              className="neu-btn"
              style={{ padding: '12px 24px', color: 'var(--text-secondary)' }}
              onClick={() => navigate('/exercise')}
            >
              Start New Workout
            </button>
          </div>
        )}

        {report && !loading && (
          <>
            <div className="animate-fade-up">
              <ProgressReport report={report} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '14px', marginTop: '32px', flexWrap: 'wrap' }}>
              <button
                className="neu-btn-accent neu-btn"
                style={{ flex: 1, padding: '14px', fontSize: '0.95rem' }}
                onClick={() => navigate('/exercise')}
              >
                <Dumbbell size={18} />
                Train Again
                <ChevronRight size={16} />
              </button>
              <button
                className="neu-btn"
                style={{ padding: '14px 24px', color: 'var(--text-secondary)' }}
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
