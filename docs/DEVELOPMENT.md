# IronIQ — Development Guide

## Frontend (Agent 1)

### Prerequisites
- Node.js 18+
- npm 9+

### Setup
```bash
cd frontend
npm install
cp .env.example .env
```

### Run (development)
```bash
npm run dev
# → http://localhost:5173
```

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Backend base URL |

### Mock Mode
When the backend is not running, the frontend **automatically uses mock adapters** in development (`import.meta.env.DEV`).  
Mock adapters are clearly marked in:
- `src/services/workoutApi.ts` — `mockWorkoutApi`
- `src/services/aiApi.ts` — `mockAiApi`
- `src/services/paymentApi.ts` — `mockPaymentApi`

Payment is **bypassed entirely** in dev mode (no modal shown).

### Backend API Dependencies
| Agent | Endpoints |
|---|---|
| Agent 2 (CV) | `POST /api/workout/start`, `POST /api/workout/frame`, `POST /api/workout/end`, `GET /api/workout/report/:id` |
| Agent 3 (AI) | `POST /api/ai/guidance`, `POST /api/ai/motivation`, `POST /api/ai/chat`, `POST /api/ai/voice` |
| Agent 3 (Payment) | `GET /api/payment/status`, `POST /api/payment/session` |

### Integration Status
- [ ] Agent 2 (CV Backend) — waiting for implementation
- [ ] Agent 3 (AI + x402 Backend) — waiting for implementation
- [x] Frontend mock adapters — complete
- [x] All pages and components — complete

### Assumptions Made
1. Backend runs on `http://localhost:5000`
2. The `/api/workout/frame` endpoint accepts `{ sessionId, landmarks: [] }` — landmarks are an array of `{ x, y, z, visibility }` objects
3. TTS voice endpoint returns raw audio bytes with appropriate Content-Type header
4. x402 payment is a session-level payment (one payment per workout, not per frame)
5. In development mode (`import.meta.env.DEV === true`), payment is bypassed and mock data is used

---

## Git Workflow

### Branches
```
main
├── frontend-agent      ← Agent 1 (you are here)
├── cv-backend-agent    ← Agent 2
└── ai-x402-agent       ← Agent 3
```

### Commit Convention
```
feat(frontend): add payment modal
fix(frontend): handle camera permission denial
feat(cv): add squat rep counter
feat(x402): add Algorand payment middleware
```

---

## Running Everything Together

```bash
# Terminal 1 — Frontend
cd frontend
npm run dev

# Terminal 2 — Backend (after Agent 2/3 implement it)
cd backend
python run.py
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`
