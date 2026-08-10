import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Square, AlertCircle } from 'lucide-react';
import { WorkoutCamera } from '../components/WorkoutCamera';
import { RepCounter } from '../components/RepCounter';
import { WorkoutTimer } from '../components/WorkoutTimer';
import { GuidancePanel } from '../components/GuidancePanel';
import { VoiceIndicator } from '../components/VoiceIndicator';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { aiApi } from '../services/aiApi';
import type { ExerciseType, GuidanceResponse } from '../types';

const isDev = import.meta.env.DEV;
const ai = aiApi; // Enforce real AI API

// Guidance call cooldown (ms)
const GUIDANCE_COOLDOWN = 4000;

export function WorkoutPage() {
  const { exercise } = useParams<{ exercise: string }>();
  const navigate = useNavigate();
  const exerciseType = (exercise as ExerciseType) ?? 'squat';

  // ── Payment handled in ExercisePage — session is pre-unlocked ────────
  const [sessionUnlocked] = useState(true); // always unlocked when we arrive here

  // ── Workout session ───────────────────────────────────────────
  const { session, frameResult, elapsed, loading, error: sessionError, startSession, sendFrame, endSession } = useWorkoutSession();
  const [workoutStarted, setWorkoutStarted] = useState(false);

  // ── Guidance ──────────────────────────────────────────────────
  const [guidance, setGuidance] = useState<GuidanceResponse>({ text: '', priority: 'low' });
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const lastGuidanceCallRef = useRef<number>(0);

  // ── Voice ─────────────────────────────────────────────────────
  const [voiceActive, setVoiceActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();

  // ── Start workout immediately ────────────────────────────────
  useEffect(() => {
    if (!workoutStarted) {
      setWorkoutStarted(true);
      startSession(exerciseType);
    }
  }, [workoutStarted, exerciseType, startSession]);

  // ── Fetch AI guidance on rep complete or form change ─────────
  const fetchGuidance = useCallback(async () => {
    if (!frameResult) return;
    const now = Date.now();
    if (now - lastGuidanceCallRef.current < GUIDANCE_COOLDOWN) return;
    lastGuidanceCallRef.current = now;

    setGuidanceLoading(true);
    try {
      const res = await ai.guidance({
        exercise: exerciseType,
        repCount: frameResult.repCount,
        formScore: frameResult.formScore,
        formFeedback: frameResult.formFeedback,
        movementState: frameResult.movementState,
      });
      setGuidance(res);

      // TTS
      if (!muted && res.text) {
        setVoiceActive(true);
        try {
          const url = await ai.voice({ text: res.text });
          if (url) setAudioUrl(url);
        } catch {
          // TTS unavailable — silent fail
        } finally {
          setTimeout(() => setVoiceActive(false), 3500);
        }
      }
    } catch {
      // Guidance unavailable — don't crash
    } finally {
      setGuidanceLoading(false);
    }
  }, [frameResult, exerciseType, muted]);

  useEffect(() => {
    if (frameResult?.repCompleted || (frameResult?.formScore && frameResult.formScore < 65)) {
      fetchGuidance();
    }
  }, [frameResult, fetchGuidance]);

  // ── End workout ───────────────────────────────────────────────
  const handleEndWorkout = async () => {
    await endSession();
    if (session?.sessionId) {
      navigate(`/report/${session.sessionId}`);
    }
  };

  return (
    <div className="page-layout">

      <div
        className="container"
        style={{
          paddingTop: '32px',
          paddingBottom: '60px',
          display: 'grid',
          gridTemplateColumns: '1fr minmax(0, 360px)',
          gap: '28px',
          alignItems: 'start',
        }}
      >
        {/* Left: Camera */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Session header */}
          <div
            className="neu-raised"
            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <span className="status-dot active" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize', flex: 1 }}>
              {exerciseType.replace('_', ' ')} Session
            </span>
            {isDev && (
              <span
                className="neu-badge"
                style={{ background: 'linear-gradient(135deg, #718096, #a0aec0)', fontSize: '0.7rem' }}
              >
                DEV / MOCK
              </span>
            )}
            {session && (
              <span className="neu-badge neu-badge-success" style={{ fontSize: '0.7rem' }}>
                {session.status.toUpperCase()}
              </span>
            )}
          </div>

          {/* Camera */}
          <WorkoutCamera
            active={sessionUnlocked && workoutStarted}
            onFrame={(landmarks) => {
              if (landmarks && landmarks.length > 0) {
                sendFrame(landmarks);
              }
            }}
            frameInterval={100}
          />

          {/* Error */}
          {sessionError && (
            <div
              className="neu-inset"
              style={{ padding: '14px 18px', display: 'flex', gap: '10px', alignItems: 'center', borderRadius: '14px' }}
            >
              <AlertCircle size={18} color="var(--danger)" />
              <p style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{sessionError}</p>
            </div>
          )}

          {/* End Workout button */}
          {workoutStarted && (
            <button
              className="neu-btn-danger neu-btn"
              style={{ padding: '14px', fontSize: '0.95rem', width: '100%' }}
              onClick={handleEndWorkout}
              disabled={loading}
            >
              {loading ? <div className="neu-spinner" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'white' }} /> : <Square size={18} />}
              End Workout
            </button>
          )}
        </div>

        {/* Right: Stats panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Rep counter + timer row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <RepCounter
              count={frameResult?.repCount ?? 0}
              exercise={exerciseType}
              repCompleted={frameResult?.repCompleted}
            />
            <WorkoutTimer seconds={elapsed} />
          </div>

          {/* Form score */}
          {frameResult && (
            <div className="neu-raised" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  Form Score
                </span>
                <span style={{ fontWeight: 900, color: frameResult.formScore >= 80 ? 'var(--success)' : frameResult.formScore >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                  {frameResult.formScore}%
                </span>
              </div>
              <div className="neu-progress-track">
                <div className="neu-progress-fill" style={{ width: `${frameResult.formScore}%` }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                {frameResult.formFeedback}
              </p>
            </div>
          )}

          {/* AI Guidance */}
          <GuidancePanel
            message={guidance.text || (workoutStarted ? 'Analyzing your form…' : 'Waiting to start…')}
            priority={guidance.priority}
            loading={guidanceLoading}
          />

          {/* Voice indicator */}
          <VoiceIndicator
            active={voiceActive}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            audioUrl={audioUrl}
          />

        </div>
      </div>

      {/* Mobile responsive override */}
      <style>{`
        @media (max-width: 768px) {
          .workout-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
