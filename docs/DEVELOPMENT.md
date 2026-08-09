# Gym Buddy — Development Guide

## Quick Start

### Frontend (Agent 1)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Runs on http://localhost:5173
```

### Backend (Agent 3 — AI + x402)
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values (see below)

python run.py
# Runs on http://localhost:5000
```

---

## Environment Variables

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000` | Backend base URL |

### Backend (`backend/.env`)
| Variable | Required | Description |
|---|---|---|
| `FLASK_DEBUG` | No | `1` for debug mode |
| `PORT` | No | Server port (default `5000`) |
| `FRONTEND_URL` | No | CORS origin (default `http://localhost:5173`) |
| `GEMINI_API_KEY` | No* | Google Gemini API key — get free at aistudio.google.com |
| `GEMINI_MODEL` | No | Model name (default `gemini-1.5-flash`) |
| `X402_NETWORK` | No | `testnet` or `mainnet` (default `testnet`) |
| `X402_RECEIVER_ADDRESS` | Yes† | Algorand address to receive payments |
| `X402_FACILITATOR_URL` | No | GoPlausible facilitator (default provided) |
| `X402_PRICE` | No | Session price in ALGO (default `0.1`) |
| `X402_ASSET` | No | `ALGO` or ASA ID (default `ALGO`) |
| `ALGORAND_NODE_URL` | No | Public TestNet node (default provided) |
| `ALGORAND_INDEXER_URL` | No | Public TestNet indexer (default provided) |

> *Without `GEMINI_API_KEY` the backend uses template-based AI responses (works fine for demos).
> †Without `X402_RECEIVER_ADDRESS` the x402 middleware runs in DEMO mode (no real chain verification).

---

## Running Tests

```bash
cd backend
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python -m pytest tests/ -v
```

Tests do NOT require `GEMINI_API_KEY` or `X402_RECEIVER_ADDRESS`.

---

## API Dependencies

The frontend depends on these backend endpoints:

| Endpoint | Owner | Status |
|---|---|---|
| `POST /api/workout/start` | Agent 2 | Pending Agent 2 merge |
| `POST /api/workout/frame` | Agent 2 | Pending Agent 2 merge |
| `POST /api/workout/end` | Agent 2 | Pending Agent 2 merge |
| `GET /api/workout/report/:sessionId` | Agent 2 | Pending Agent 2 merge |
| `POST /api/ai/guidance` | **Agent 3** ✅ | **Ready** |
| `POST /api/ai/motivation` | **Agent 3** ✅ | **Ready** |
| `POST /api/ai/chat` | **Agent 3** ✅ | **Ready** |
| `POST /api/ai/voice` | **Agent 3** ✅ | **Ready** |
| `GET /api/payment/status` | **Agent 3** ✅ | **Ready** |
| `POST /api/payment/session` | **Agent 3** ✅ | **Ready (x402 protected)** |
| `POST /api/payment/verify` | **Agent 3** ✅ | **Ready** |

---

## x402 Payment Flow

```
Frontend
  │
  ├─ POST /api/payment/session (no X-PAYMENT header)
  │   ← HTTP 402 Payment Required
  │   ← { accepts: [{ scheme, payTo, price, network }] }
  │
  │  [User completes Algorand payment on-chain]
  │
  ├─ POST /api/payment/session (with X-PAYMENT: <proof>)
  │   ← Middleware forwards to facilitator for verification
  │   ← HTTP 200 { sessionId, status: "verified" }
  │
  └─ POST /api/workout/start (session now unlocked)
```

### Demo Mode (no receiver address set)
- `POST /api/payment/session` without `X-PAYMENT` → `HTTP 402`
- `POST /api/payment/session` with `X-PAYMENT: anything` → `HTTP 200`

### Production Mode (with receiver address + x402-avm installed)
- Real Algorand TestNet payment verification via GoPlausible facilitator

---

## AI Fallback Behaviour

| Condition | Behaviour |
|---|---|
| `GEMINI_API_KEY` set | Uses Gemini 1.5 Flash |
| `GEMINI_API_KEY` not set | Uses curated fitness template responses |
| Gemini API error | Automatically falls back to templates |
| TTS (gTTS) network error | Returns `500` with error message |

---

## Agent Boundaries (do not cross)

| Directory | Owner |
|---|---|
| `frontend/` | Agent 1 |
| `backend/app/routes/workout.py` | Agent 2 |
| `backend/app/services/` | Agent 2 |
| `backend/app/ai/` | **Agent 3** |
| `backend/app/payment/` | **Agent 3** |
| `backend/app/routes/ai.py` | **Agent 3** |
| `backend/app/routes/payment.py` | **Agent 3** |
| `backend/app/__init__.py` | Agent 3 (coordinates with Agent 2) |
| `docs/API_CONTRACT.md` | All agents (shared) |
