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

Payment uses `x402Fetch` to automatically intercept `402 Payment Required` responses and trigger the connected Algorand wallet via `@txnlab/use-wallet-react`.

### Backend API Dependencies
| Agent | Endpoints |
|---|---|
| Agent 2 (CV) | `POST /api/workout/start`, `POST /api/workout/frame`, `POST /api/workout/end`, `GET /api/workout/report/:id` |
| Agent 3 (AI) | `POST /api/ai/guidance`, `POST /api/ai/motivation`, `POST /api/ai/chat`, `POST /api/ai/voice` |
| Agent 3 (Payment) | `POST /api/payment/session` (402 Protected, handles x402 verification) |

### Integration Status
- [x] Agent 2 (CV Backend) — **complete** (`cv-backend-agent` branch)
- [x] Agent 3 (AI + x402 Backend) — **complete** (`ai-x402-agent` branch, real TestNet USDC payment)
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

---

## CV + Workout Backend (Agent 2)

### Prerequisites
- Python 3.11+

### Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
cp .env.example .env
```

### Run
```bash
python run.py
# → http://localhost:5000
# → http://localhost:5000/health  (liveness check)
```

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `FLASK_PORT` | `5000` | Server port |
| `FLASK_DEBUG` | `1` | Enable debug mode |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins |

### Run Tests
```bash
cd backend
venv\Scripts\activate
python -m pytest tests/ -v
```

### Architecture Notes
- **Frame processing**: The frontend sends pre-extracted MediaPipe landmarks (`x, y, z, visibility`) per frame — the backend never receives raw video, keeping bandwidth low.
- **Session store**: In-memory for MVP. Swap `session_service.py` for a DB-backed implementation without touching routes.
- **Adding exercises**: Register a new `ExerciseAnalyzer` subclass in `exercise_service.SUPPORTED_EXERCISES` — no route changes needed.
- **AI boundary**: CV services produce `formFeedback` strings (short, factual). Agent 3's LLM converts these into natural guidance. CV never calls an LLM.
- **x402 boundary**: Payment middleware lives entirely in Agent 3. CV routes have no payment logic.

### Supported Exercises
| Key | Label |
|---|---|
| `squat` | Squat |
| `bicep_curl` | Bicep Curl |
| `push_up` | Push-Up |

### CV Backend File Map
```
backend/
├── run.py                            ← Entry point
├── requirements.txt
├── pytest.ini
├── conftest.py                       ← pytest sys.path fix
├── app/
│   ├── __init__.py                   ← Flask factory + CORS
│   ├── models/workout.py             ← WorkoutSession, FrameResult, WorkoutReport
│   ├── utils/
│   │   ├── angles.py                 ← calculate_angle()
│   │   └── config.py                 ← env-based config
│   ├── services/
│   │   ├── pose_service.py           ← LandmarkIndex + accessors
│   │   ├── exercise_service.py       ← analyzer factory
│   │   ├── session_service.py        ← in-memory session store
│   │   ├── report_service.py         ← report calculation
│   │   └── analyzers/
│   │       ├── base.py               ← ExerciseAnalyzer ABC
│   │       ├── squat.py              ← SquatAnalyzer
│   │       ├── bicep_curl.py         ← BicepCurlAnalyzer
│   │       └── push_up.py            ← PushUpAnalyzer
│   └── routes/
│       └── workout.py                ← Blueprint: /api/workout/*
└── tests/
    ├── landmark_helpers.py           ← Synthetic landmark factory
    ├── test_angles.py
    ├── test_squat.py
    ├── test_bicep_curl.py
    ├── test_push_up.py
    ├── test_session.py
    └── test_report.py
```
