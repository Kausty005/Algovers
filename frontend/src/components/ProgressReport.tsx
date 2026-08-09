import { TrendingUp, TrendingDown, Award, Clock, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import type { WorkoutReport } from '../types';

interface Props {
  report: WorkoutReport;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDuration(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

function StatCard({ icon, label, value, color = 'var(--accent)' }: StatCardProps) {
  return (
    <div
      className="neu-raised"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        flex: 1,
        minWidth: '120px',
      }}
    >
      <div
        className="neu-circle"
        style={{ width: 48, height: 48, boxShadow: `4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light), 0 0 12px ${color}30` }}
      >
        {icon}
      </div>
      <span
        style={{
          fontSize: '1.8rem',
          fontWeight: 900,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function ProgressReport({ report }: Props) {
  const formPct = Math.round(report.averageFormScore);
  const improved = report.improvementPercentage > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <div className="neu-circle" style={{ width: 72, height: 72, margin: '0 auto 12px' }}>
          <Award size={34} color="var(--accent)" />
        </div>
        <h2 className="neu-heading" style={{ fontSize: '1.6rem' }}>Workout Complete!</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', textTransform: 'capitalize' }}>
          {report.exercise.replace('_', ' ')} Session
        </p>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <StatCard
          icon={<RotateCcw size={22} color="var(--accent)" />}
          label="Total Reps"
          value={report.totalReps}
        />
        <StatCard
          icon={<CheckCircle size={22} color="var(--success)" />}
          label="Correct"
          value={report.correctReps}
          color="var(--success)"
        />
        <StatCard
          icon={<XCircle size={22} color="var(--danger)" />}
          label="Incorrect"
          value={report.incorrectReps}
          color="var(--danger)"
        />
        <StatCard
          icon={<Clock size={22} color="var(--info)" />}
          label="Duration"
          value={formatDuration(report.durationSeconds)}
          color="var(--info)"
        />
      </div>

      {/* Form score */}
      <div className="neu-raised" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Form Score</span>
          <span style={{ fontWeight: 900, fontSize: '1.4rem', color: formPct >= 80 ? 'var(--success)' : formPct >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
            {formPct}%
          </span>
        </div>
        <div className="neu-progress-track">
          <div className="neu-progress-fill" style={{ width: `${formPct}%` }} />
        </div>
      </div>

      {/* Improvement */}
      <div
        className="neu-raised"
        style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          className="neu-circle"
          style={{
            width: 52,
            height: 52,
            boxShadow: improved
              ? `4px 4px 10px var(--neu-shadow-dark), -4px -4px 10px var(--neu-shadow-light), 0 0 12px var(--success)30`
              : undefined,
          }}
        >
          {improved ? (
            <TrendingUp size={24} color="var(--success)" />
          ) : (
            <TrendingDown size={24} color="var(--warning)" />
          )}
        </div>
        <div>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            {improved
              ? `+${Math.abs(report.improvementPercentage).toFixed(1)}% improvement`
              : `${Math.abs(report.improvementPercentage).toFixed(1)}% below last session`}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
            Previous session: {report.previousReps} reps
          </p>
        </div>
      </div>
    </div>
  );
}
