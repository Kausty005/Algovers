import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Dumbbell, ChevronRight, CheckCircle } from 'lucide-react';
import { ProgressReport } from '../components/ProgressReport';
import { workoutApi } from '../services/workoutApi';
import type { WorkoutReport } from '../types';

const api = workoutApi;

export function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<WorkoutReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refund, setRefund] = useState<{ amount: number; txId: string } | null>(null);

  useEffect(() => {
    // Read and clear any pending refund notification
    const stored = sessionStorage.getItem('lastRefund');
    if (stored) {
      try { setRefund(JSON.parse(stored)); } catch {}
      sessionStorage.removeItem('lastRefund');
    }
  }, []);

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

        {/* Refund Banner */}
        {refund && refund.amount > 0 && (
          <div
            className="animate-fade-up"
            style={{
              marginBottom: '24px',
              padding: '16px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.12), rgba(39, 174, 96, 0.05))',
              border: '1px solid rgba(39, 174, 96, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div className="neu-circle" style={{ width: 44, height: 44, flexShrink: 0, boxShadow: '4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light), 0 0 12px rgba(39,174,96,0.3)' }}>
              <CheckCircle size={22} color="var(--success)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: 'var(--success)', margin: 0, fontSize: '0.95rem' }}>
                Session Wallet Refunded
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                <strong style={{ color: 'var(--success)' }}>{refund.amount.toFixed(4)} USDC</strong> returned to your wallet — unspent balance refunded automatically.
              </p>
            </div>
          </div>
        )}

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
