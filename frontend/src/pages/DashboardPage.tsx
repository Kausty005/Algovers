import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  Activity,
  MessageSquare,
  BarChart3,
  ChevronRight,
  Zap,
  Target,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const QUICK_ACTIONS = [
  { label: 'Start Workout', icon: Dumbbell, to: '/exercise', accent: true },
  { label: 'AI Chat', icon: MessageSquare, to: '/chat', accent: false },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/workout/dashboard')
      .then(data => setStats(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const QUICK_STATS = [
    { label: 'Total Sessions', value: loading ? '...' : (stats?.totalWorkouts ?? '0'), icon: Activity, color: 'var(--accent)' },
    { label: 'Total Reps', value: loading ? '...' : (stats?.totalReps ?? '0'), icon: Zap, color: 'var(--warning)' },
    { label: 'Time (mins)', value: loading ? '...' : (stats?.totalDurationMinutes ?? '0'), icon: Target, color: 'var(--success)' },
  ];

  return (
    <div className="page-layout">
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }} className="animate-fade-up">
          <h1 className="neu-heading" style={{ fontSize: '2rem', marginBottom: '6px' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Track your progress and start your next session.
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '20px',
            marginBottom: '36px',
          }}
        >
          {QUICK_STATS.map(({ label, value, icon: Icon, color }, i) => (
            <div
              key={label}
              className="neu-raised animate-fade-up"
              style={{
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                animationDelay: `${i * 0.08}s`,
                animationFillMode: 'both',
              }}
            >
              <div
                className="neu-circle"
                style={{
                  width: 50,
                  height: 50,
                  boxShadow: `4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light), 0 0 12px ${color}30`,
                }}
              >
                <Icon size={22} color={color} />
              </div>
              <div>
                <p style={{ fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1 }}>
                  {value}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 500 }}>
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2
          style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '16px' }}
        >
          Quick Actions
        </h2>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
          {QUICK_ACTIONS.map(({ label, icon: Icon, to, accent }) => (
            <button
              key={label}
              className={accent ? 'neu-btn-accent neu-btn' : 'neu-btn'}
              style={{ padding: '14px 28px', fontSize: '0.95rem', borderRadius: '14px' }}
              onClick={() => navigate(to)}
            >
              <Icon size={20} />
              {label}
              <ChevronRight size={16} />
            </button>
          ))}
        </div>

        {/* Info banner / History */}
        {(stats?.recentWorkouts?.length ?? 0) > 0 ? (
          <div className="animate-fade-up">
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '16px' }}>Recent Workouts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stats.recentWorkouts.map((w: any) => (
                <div key={w.id} className="neu-inset" style={{ padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{w.exercise}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(w.date * 1000).toLocaleString()}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{w.reps} Reps</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="neu-raised animate-fade-up"
            style={{
              padding: '28px',
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              background: 'var(--neu-bg)',
            }}
          >
            <div className="neu-circle" style={{ width: 56, height: 56, flexShrink: 0 }}>
              <BarChart3 size={26} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '4px' }}>Session History</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Complete your first workout to see your progress statistics here.
                Your rep counts, form scores, and improvement trends will appear after each session.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
