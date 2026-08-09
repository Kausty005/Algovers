# Gym Buddy — API Contract

> **Agreement between Agent 1 (Frontend), Agent 2 (CV Backend), Agent 3 (AI + x402 Backend)**
>
> Do not change these contracts without updating this document and notifying the other agents.

---

## Base URL

```
http://localhost:5000
```

---

## Workout Endpoints (Agent 2)

### `POST /api/workout/start`

**Request:**
```json
{ "exercise": "squat" }
```

**Response:**
```json
{
  "sessionId": "abc123",
  "exercise": "squat",
  "status": "active"
}
```

---

### `POST /api/workout/frame`

**Request:**
```json
{
  "sessionId": "abc123",
  "landmarks": [
    { "x": 0.5, "y": 0.3, "z": 0.0, "visibility": 0.99 }
  ]
}
```

**Response:**
```json
{
  "sessionId": "abc123",
  "repCount": 7,
  "movementState": "ascending",
  "formScore": 86,
  "formFeedback": "Keep your knees aligned.",
  "repCompleted": true
}
```

---

### `POST /api/workout/end`

**Request:**
```json
{ "sessionId": "abc123" }
```

**Response:**
```json
{
  "sessionId": "abc123",
  "status": "completed"
}
```

---

### `GET /api/workout/report/:sessionId`

**Response:**
```json
{
  "sessionId": "abc123",
  "exercise": "squat",
  "totalReps": 20,
  "correctReps": 17,
  "incorrectReps": 3,
  "durationSeconds": 420,
  "averageFormScore": 84,
  "previousReps": 15,
  "improvementPercentage": 33.3
}
```

---

## AI Endpoints (Agent 3)

### `POST /api/ai/guidance`

**Request:**
```json
{
  "exercise": "squat",
  "repCount": 8,
  "formScore": 78,
  "formFeedback": "Knees moving inward",
  "movementState": "bottom"
}
```

**Response:**
```json
{
  "text": "Keep your knees aligned with your feet.",
  "priority": "high"
}
```
> `priority`: `"low"` | `"medium"` | `"high"`

---

### `POST /api/ai/motivation`

**Request:**
```json
{
  "exercise": "squat",
  "repCount": 8,
  "targetReps": 12,
  "formScore": 88
}
```

**Response:**
```json
{ "text": "Great work! Four more reps!" }
```

---

### `POST /api/ai/chat`

**Request:**
```json
{ "message": "How can I improve my squat?" }
```

**Response:**
```json
{ "response": "Focus on keeping your knees aligned and controlling the descent." }
```

---

### `POST /api/ai/voice`

**Request:**
```json
{ "text": "Great work! Keep going!" }
```

**Response:** Audio bytes (`audio/mpeg` or `audio/wav` Content-Type)

---

## Payment Endpoints (Agent 3)

### `GET /api/payment/status`

**Response:**
```json
{
  "status": "verified",
  "sessionId": "pay-abc123",
  "network": "algorand-testnet",
  "price": "0.1",
  "asset": "ALGO",
  "receiverAddress": "ALGO_ADDRESS..."
}
```
> `status`: `"idle"` | `"required"` | `"processing"` | `"verified"` | `"failed"`

---

### `POST /api/payment/session`

**Request:**
```json
{ "exercise": "squat" }
```

**Response:**
```json
{
  "sessionId": "pay-abc123",
  "paymentAddress": "ALGORAND_ADDRESS...",
  "amount": "0.1",
  "asset": "ALGO",
  "network": "algorand-testnet",
  "status": "required"
}
```

---

## x402 Protected Resource

**Endpoint:** `POST /api/workout/session` (or `/api/workout/start` with x402 middleware)

**Unpaid response:**
```
HTTP 402 Payment Required
```

**Paid response:**
```
HTTP 200 + normal session response
```

---

## Exercise Types

| Value | Label |
|---|---|
| `squat` | Squat |
| `bicep_curl` | Bicep Curl |
| `push_up` | Push-Up |

---

## Error Format

All errors return JSON:
```json
{ "error": "Human-readable error message" }
```
