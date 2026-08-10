import { apiFetch, BASE_URL } from './api';
import type {
  GuidanceRequest,
  GuidanceResponse,
  MotivationRequest,
  MotivationResponse,
  ChatRequest,
  ChatResponse,
  VoiceRequest,
} from '../types';

export const aiApi = {
  guidance: (req: GuidanceRequest): Promise<GuidanceResponse> =>
    apiFetch<GuidanceResponse>('/api/ai/guidance', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  motivation: (req: MotivationRequest): Promise<MotivationResponse> =>
    apiFetch<MotivationResponse>('/api/ai/motivation', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  chat: (req: ChatRequest): Promise<ChatResponse> =>
    apiFetch<ChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  /** Returns a Blob URL for the audio */
  voice: async (req: VoiceRequest): Promise<string> => {
    const response = await fetch(`${BASE_URL}/api/ai/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!response.ok) throw new Error('TTS request failed');
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
};

// ─── MOCK (DEV ONLY) ─────────────────────────────────────────────
let mockCredits = 0;

export const mockAiApi = {
  guidance: async (): Promise<GuidanceResponse> => ({
    text: 'Keep your back straight and core engaged.',
    priority: 'medium',
  }),
  motivation: async (): Promise<MotivationResponse> => ({
    text: "You're doing great! Keep it up!",
  }),
  chat: async (req: ChatRequest): Promise<ChatResponse> => {
    if (mockCredits <= 0) {
       throw new Error(JSON.stringify({ error: "Insufficient credits", code: "NO_CREDITS" }));
    }
    mockCredits--;
    return {
      response: `[MOCK] You asked: "${req.message}". Focus on form and consistency!`,
      creditsRemaining: mockCredits,
    };
  },
  voice: async (): Promise<string> => '',
  _setMockCredits: (c: number) => { mockCredits = c; }
};
