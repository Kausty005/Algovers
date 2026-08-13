// ─── Workout ────────────────────────────────────────────────────
export type ExerciseType = 'squat' | 'bicep_curl' | 'push_up';

export interface WorkoutSession {
  sessionId: string;
  exercise: ExerciseType;
  status: 'active' | 'completed' | 'error';
}

export interface FrameResult {
  sessionId: string;
  repCount: number;
  movementState: string;
  formScore: number;
  formFeedback: string;
  repCompleted: boolean;
}

export interface WorkoutReport {
  sessionId: string;
  exercise: ExerciseType;
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  durationSeconds: number;
  averageFormScore: number;
  previousReps: number;
  improvementPercentage: number;
}

// ─── AI ─────────────────────────────────────────────────────────
export interface GuidanceRequest {
  exercise: ExerciseType;
  repCount: number;
  formScore: number;
  formFeedback: string;
  movementState: string;
}

export interface GuidanceResponse {
  text: string;
  priority: 'low' | 'medium' | 'high';
}

export interface MotivationRequest {
  exercise: ExerciseType;
  repCount: number;
  targetReps: number;
  formScore: number;
}

export interface MotivationResponse {
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  sessionId: string;
}

export interface ChatResponse {
  response: string;
  creditsRemaining?: number;
}

export interface VoiceRequest {
  text: string;
}

// ─── Payment ─────────────────────────────────────────────────────
export type PaymentStatus =
  | 'idle'
  | 'required'
  | 'processing'
  | 'verified'
  | 'failed';

export interface PaymentStatusResponse {
  status: PaymentStatus;
  sessionId?: string;
  network?: string;
  price?: string;
  asset?: string;
  receiverAddress?: string;
}

export interface PaymentSessionRequest {
  exercise: ExerciseType;
}

export interface PaymentSessionResponse {
  sessionId: string;
  paymentAddress: string;
  amount: string;
  asset: string;
  network: string;
  status: PaymentStatus;
  txId?: string; // Optional: returned by the server after payment verification
}

// ─── API State ───────────────────────────────────────────────────
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ─── Agentic Payment ─────────────────────────────────────────────
export type AgentServiceType = 'text-guidance' | 'voice-guidance';

export interface AgentDecision {
  id: string;
  action: AgentServiceType;
  amount: string;        // e.g. "0.01"
  transactionId: string; // Algorand TX ID
  timestamp: number;
  reason: string;        // e.g. "Form score 42% for 35s"
  formScore: number;
}

export interface SessionWalletState {
  address: string;
  balance: number;     // USDC remaining
  spent: number;       // USDC total spent
  funded: number;      // USDC initially funded
  active: boolean;
}

export interface AgentGuidanceResponse {
  text: string;
  priority: 'low' | 'medium' | 'high';
  transactionId: string;
  service: AgentServiceType;
  cost: string;
  audioBase64?: string;
  audioMimeType?: string;
}
