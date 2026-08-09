import { apiFetch } from './api';
import type {
  ExerciseType,
  WorkoutSession,
  FrameResult,
  WorkoutReport,
} from '../types';

export const workoutApi = {
  /** Start a new workout session */
  start: (exercise: ExerciseType): Promise<WorkoutSession> =>
    apiFetch<WorkoutSession>('/api/workout/start', {
      method: 'POST',
      body: JSON.stringify({ exercise }),
    }),

  /** Send a processed frame / landmarks to backend */
  sendFrame: (
    sessionId: string,
    landmarks: unknown[],
    image?: string
  ): Promise<FrameResult> =>
    apiFetch<FrameResult>('/api/workout/frame', {
      method: 'POST',
      body: JSON.stringify({ sessionId, landmarks, image }),
    }),

  /** End the current session */
  end: (sessionId: string): Promise<{ sessionId: string; status: string }> =>
    apiFetch('/api/workout/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    }),

  /** Get the workout report for a session */
  getReport: (sessionId: string): Promise<WorkoutReport> =>
    apiFetch<WorkoutReport>(`/api/workout/report/${sessionId}`),
};

// ─── MOCK (used when backend unavailable — DEV ONLY) ─────────────
export const mockWorkoutApi = {
  start: async (exercise: ExerciseType): Promise<WorkoutSession> => ({
    sessionId: `mock-${Date.now()}`,
    exercise,
    status: 'active',
  }),
  sendFrame: async (_sessionId: string, _landmarks: unknown[], _image?: string): Promise<FrameResult> => ({
    sessionId: _sessionId,
    repCount: Math.floor(Math.random() * 15),
    movementState: 'ascending',
    formScore: 80 + Math.floor(Math.random() * 20),
    formFeedback: 'Keep your knees aligned.',
    repCompleted: Math.random() > 0.7,
  }),
  end: async (sessionId: string) => ({ sessionId, status: 'completed' }),
  getReport: async (sessionId: string): Promise<WorkoutReport> => ({
    sessionId,
    exercise: 'squat',
    totalReps: 20,
    correctReps: 17,
    incorrectReps: 3,
    durationSeconds: 420,
    averageFormScore: 84,
    previousReps: 15,
    improvementPercentage: 33.3,
  }),
};
