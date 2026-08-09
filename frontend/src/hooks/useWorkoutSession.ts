import { useState, useCallback, useRef } from 'react';
import type { ExerciseType, WorkoutSession, FrameResult } from '../types';
import { workoutApi } from '../services/workoutApi';

export function useWorkoutSession() {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [frameResult, setFrameResult] = useState<FrameResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = useCallback(async (exercise: ExerciseType) => {
    setLoading(true);
    setError(null);
    try {
      const s = await workoutApi.start(exercise);
      setSession(s);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return s;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workout');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendFrame = useCallback(
    async (landmarks: unknown[]) => {
      if (!session) return null;
      try {
        const result = await workoutApi.sendFrame(session.sessionId, landmarks);
        setFrameResult(result);
        return result;
      } catch {
        // silently swallow frame errors — don't crash UI
        return null;
      }
    },
    [session]
  );

  const endSession = useCallback(async () => {
    if (!session) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    try {
      await workoutApi.end(session.sessionId);
      setSession((s) => s ? { ...s, status: 'completed' } : s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end workout');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSession(null);
    setFrameResult(null);
    setElapsed(0);
    setError(null);
  }, []);

  return {
    session,
    frameResult,
    elapsed,
    loading,
    error,
    startSession,
    sendFrame,
    endSession,
    reset,
  };
}
