# IronIQ — Architecture

## System Diagram

```
                     GYM BUDDY
                         │
             ┌───────────┴───────────┐
             │                       │
         FRONTEND                 BACKEND
             │                       │
      React + Vite              Python Flask
      TypeScript                     │
      Tailwind CSS          ┌────────┼────────┐
      Neumorphism UI        │        │        │
      Port: 5173           CV       AI      x402
                            │        │        │
                        MediaPipe   LLM   Algorand
                            │        │        │
                            │       TTS       │
                            └────────┴────────┘
                                     │
                              Progress Report
```

## Frontend Architecture

```
src/
├── components/       ← Reusable UI building blocks
│   ├── Navbar
│   ├── WorkoutCamera    Camera + frame capture
│   ├── RepCounter       Animated rep display
│   ├── WorkoutTimer     Session stopwatch
│   ├── GuidancePanel    AI coaching messages
│   ├── VoiceIndicator   TTS status + mute control
│   ├── PaymentModal     x402 payment flow
│   ├── Chatbot          AI chat interface
│   ├── ProgressReport   Post-workout stats
│   └── ExerciseSelector Exercise picker
├── pages/            ← Route-level components
│   ├── LandingPage      / 
│   ├── DashboardPage    /dashboard
│   ├── ExercisePage     /exercise
│   ├── WorkoutPage      /workout/:exercise
│   ├── ChatPage         /chat
│   └── ReportPage       /report/:sessionId
├── services/         ← All API calls (never in components)
│   ├── api.ts           Base fetch client
│   ├── workoutApi.ts    Agent 2 endpoints
│   ├── aiApi.ts         Agent 3 AI endpoints
│   └── paymentApi.ts    Agent 3 payment endpoints
├── hooks/            ← Stateful logic
│   ├── useCamera.ts     Browser MediaDevices API
│   ├── useWorkoutSession.ts  Session lifecycle + timer
│   └── usePayment.ts    Payment state machine
└── types/
    └── index.ts         All shared TypeScript types
```

## Payment Flow

```
Frontend                Backend (Agent 3)               GoPlausible Facilitator
   │                          │                                  │
   ├── POST /api/payment/session ──→                             │
   │ ←── 402 Payment Required ──────                             │
   │                          │                                  │
   │  (x402Fetch intercepts)                                     │
   │                          │                                  │
   ├── Wallet signs tx ─────────────                             │
   │                          │                                  │
   ├── POST /api/payment/session + Proof ──→                     │
   │                          │                                  │
   │                          ├─── Verify Proof ────────────────→│
   │                          │                                  │
   │                          ├─── Settle Payment ─────────────→│
   │                          │                                  │
   │ ←── 200 OK { sessionId } ──────                             │
   │                          │                                  │
   [Workout session active]
```

## Rep Counting Flow (No counting on frontend)

```
Browser Camera (Frontend)
   │  frame every 500ms
   ▼
POST /api/workout/frame  →  Agent 2 (MediaPipe)
                                │
                            Landmark detection
                            Angle calculation
                            State machine (UP/DOWN)
                            Rep counting
                                │
   ◄── { repCount, formScore, formFeedback } ──
   │
Display in UI
   │  on rep complete / bad form
   ▼
POST /api/ai/guidance  →  Agent 3 (LLM)
                                │
   ◄── { text, priority } ──────
   │
POST /api/ai/voice  →  Agent 3 (TTS)
   ◄── audio bytes ─────────────
   │
Play audio in browser
```

## Design Language — Neumorphism

All UI uses a strict neumorphism design system:
- **Background:** `#e0e5ec`
- **Shadow light:** `#ffffff` (top-left)
- **Shadow dark:** `#a3b1c6` (bottom-right)
- **Raised:** `box-shadow: 6px 6px 14px #a3b1c6, -6px -6px 14px #ffffff`
- **Inset (inputs/active):** `box-shadow: inset 4px 4px 8px #a3b1c6, inset -4px -4px 8px #ffffff`
- **Accent:** `#6c63ff` (Electric Indigo)
- **Typography:** Inter (Google Fonts)

## Agent Boundaries

| Area | Owner |
|---|---|
| `frontend/` | Agent 1 |
| `backend/app/routes/workout.py` | Agent 2 |
| `backend/app/services/pose_service.py` | Agent 2 |
| `backend/app/services/rep_counter.py` | Agent 2 |
| `backend/app/ai/` | Agent 3 |
| `backend/app/payment/` | Agent 3 |
| `backend/app/routes/ai.py` | Agent 3 |
| `backend/app/routes/payment.py` | Agent 3 |
| `docs/API_CONTRACT.md` | All agents (shared) |
