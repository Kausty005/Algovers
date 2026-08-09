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

### `POST /api/payment/session` (x402 Protected Resource)

**Request:**
```json
{ "exercise": "squat" }
```

**Unpaid Response (Intercepted by Frontend `@x402/fetch`):**
```http
HTTP 402 Payment Required
payment-required: <base64 encoded x402 requirements>
```

**Paid Response (After Wallet Signature via Facilitator):**
```json
{
  "sessionId": "pay-abc123",
  "exercise": "squat",
  "status": "active"
}
```

---

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
