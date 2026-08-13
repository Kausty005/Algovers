import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Square, AlertCircle } from 'lucide-react';
import { Loader } from 'lucide-react';
import { WorkoutCamera } from '../components/WorkoutCamera';
import { RepCounter } from '../components/RepCounter';
import { WorkoutTimer } from '../components/WorkoutTimer';
import { GuidancePanel } from '../components/GuidancePanel';
import { VoiceIndicator } from '../components/VoiceIndicator';
import { AgentActivityLog } from '../components/AgentActivityLog';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { evaluateFrame, getAgentLog, isTextGuidanceUnlocked, isVoiceGuidanceUnlocked, resetAgent } from '../services/agentService';
import { refundSessionWallet } from '../services/sessionWallet';
import type { ExerciseType, AgentDecision } from '../types';

const isDev = import.meta.env.DEV;

export function WorkoutPage() {
  const { exercise } = useParams<{ exercise: string }>();
  const navigate = useNavigate();
  const exerciseType = (exercise as ExerciseType) ?? 'squat';

  // ── Payment handled in ExercisePage — session is pre-unlocked ────────
  const [sessionUnlocked] = useState(true);

  // ── Workout session ───────────────────────────────────────────
  const { session, frameResult, elapsed, loading, error: sessionError, startSession, sendFrame, endSession } = useWorkoutSession();
  const [workoutStarted, setWorkoutStarted] = useState(false);

  // ── Agent State ───────────────────────────────────────────────
  const [agentDecisions, setAgentDecisions] = useState<AgentDecision[]>([]);
  const [guidanceText, setGuidanceText] = useState('');
  const [guidancePriority, setGuidancePriority] = useState<'low'|'medium'|'high'>('low');
  
  // ── Voice ─────────────────────────────────────────────────────
  const [voiceActive, setVoiceActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();

  const [simulateBadForm, setSimulateBadForm] = useState(false);
  const [isAgentPurchasing, setIsAgentPurchasing] = useState(false);
  const [purchasingService, setPurchasingService] = useState('');
  const [guidanceDisabled, setGuidanceDisabled] = useState(false);

  // ── Start workout immediately ────────────────────────────────
  useEffect(() => {
    if (!workoutStarted) {
      setWorkoutStarted(true);
      resetAgent();
      startSession(exerciseType);
    }
  }, [workoutStarted, exerciseType, startSession]);

  // ── Feed frames to the IronIQ Agent ──────────────────────────
  useEffect(() => {
    if (!frameResult || !workoutStarted || isAgentPurchasing || guidanceDisabled) return;

    // Simulate bad form if toggle is enabled
    const effectiveFrameResult = simulateBadForm 
      ? { ...frameResult, formScore: 40, formFeedback: "Simulated bad form!" } 
      : frameResult;

    // Run agent evaluation asynchronously
    evaluateFrame(
      effectiveFrameResult, 
      exerciseType, 
      elapsed,
      (service) => {
        setPurchasingService(service);
        setIsAgentPurchasing(true);
      },
      () => {
        setIsAgentPurchasing(false);
        setPurchasingService('');
      }
    ).then(response => {
      if (response) {
        // Agent made a purchase! Update UI
        setAgentDecisions(getAgentLog());
        setGuidanceText(response.text);
        setGuidancePriority(response.priority);

        // If it bought voice guidance, play it
        if (response.service === 'voice-guidance' && response.audioBase64 && !muted) {
          const url = `data:${response.audioMimeType};base64,${response.audioBase64}`;
          setAudioUrl(url);
          setVoiceActive(true);
          setTimeout(() => setVoiceActive(false), 4000);
        }
      }
    }).catch(err => {
      console.error("Agent evaluation failed", err);
    });
  }, [frameResult, exerciseType, elapsed, muted, workoutStarted, simulateBadForm, isAgentPurchasing]);

  // ── End workout ───────────────────────────────────────────────
  const handleEndWorkout = async () => {
    // Refund any remaining session wallet balance
    refundSessionWallet();
    
    await endSession();
    if (session?.sessionId) {
      navigate(`/report/${session.sessionId}`);
    } else {
      navigate('/dashboard');
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
        {/* Left: Camera & Agent Log */}
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
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Simulate Bad Form</span>
              <label className="switch" style={{ margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={simulateBadForm} 
                  onChange={(e) => setSimulateBadForm(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          {/* Camera */}
          <div style={{ position: 'relative' }}>
            <WorkoutCamera
              active={sessionUnlocked && workoutStarted}
              onFrame={(landmarks) => {
                if (landmarks && landmarks.length > 0) {
                  sendFrame(landmarks);
                }
              }}
              frameInterval={100}
            />
            {isAgentPurchasing && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                borderRadius: '24px', zIndex: 10,
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <Loader className="animate-spin" size={48} color="var(--accent)" style={{ marginBottom: '16px' }} />
                <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Agent Negotiating Payment...</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '8px' }}>
                  Purchasing {purchasingService.replace('-', ' ')} on-chain (TestNet)
                </p>
                <button
                  className="neu-btn"
                  style={{ 
                    marginTop: '24px', 
                    padding: '10px 24px', 
                    fontSize: '0.9rem', 
                    backgroundColor: 'rgba(255,255,255,0.1)', 
                    color: 'white', 
                    border: '1px solid rgba(255,255,255,0.2)' 
                  }}
                  onClick={() => {
                    setGuidanceDisabled(true);
                    setIsAgentPurchasing(false);
                  }}
                >
                  Skip & Disable Guidance
                </button>
              </div>
            )}
          </div>

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

          {/* Agent Activity Log */}
          <div style={{ height: '300px' }}>
            <AgentActivityLog decisions={agentDecisions} />
          </div>

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

          {/* AI Guidance (Agent Locked/Unlocked) */}
          <GuidancePanel
            message={guidanceDisabled ? 'Guidance Disabled' : (guidanceText || (isTextGuidanceUnlocked() ? 'Analyzing your form…' : 'Agent monitoring...'))}
            priority={guidancePriority}
            locked={!isTextGuidanceUnlocked()}
            agentPurchased={isTextGuidanceUnlocked()}
          />

          {/* Voice indicator (Agent Locked/Unlocked) */}
          <VoiceIndicator
            active={voiceActive}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            audioUrl={audioUrl}
            locked={!isVoiceGuidanceUnlocked()}
            agentPurchased={isVoiceGuidanceUnlocked()}
          />

        </div>
      </div>
    </div>
  );
}
