# IronIQ 🏋️

> AI-powered fitness assistant with x402/Algorand pay-per-use workout sessions.
Demo Video :- https://drive.google.com/file/d/1y0SyzuYWgEYZ8SxITYa8KTYMqsbrgEb3/view?usp=drivesdk
## Architecture

```
                     GYM BUDDY
                         |
             ┌───────────┴───────────┐
             |                       |
         FRONTEND                 BACKEND
             |                       |
      React + Vite              Python Flask
      TypeScript                     |
      Tailwind CSS          ┌────────┼────────┐
      Neumorphism UI        |        |        |
                           CV       AI      x402
                            |        |        |
                        MediaPipe   LLM   Algorand
                            |        |        |
                            |       TTS       |
                            └────────┴────────┘
                                     |
                              Progress Report
```

## Agents

| Agent | Role | Branch |
|---|---|---|
| Agent 1 | Frontend (React + Vite) | `frontend-agent` |
| Agent 2 | CV + Workout Backend | `cv-backend-agent` |
| Agent 3 | AI + x402 Backend | `ai-x402-agent` |

## Quick Start

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Backend (Agent 2)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

## Docs
- [Architecture](docs/ARCHITECTURE.md)
- [API Contract](docs/API_CONTRACT.md)
- [Development Guide](docs/DEVELOPMENT.md)
