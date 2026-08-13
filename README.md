# IronIQ — AI Fitness Coach with Agentic x402 Payments

> AI-powered fitness coaching with real-time pose estimation and autonomous micro-payments using x402 on Algorand.
>Demo Video :- https://drive.google.com/file/d/1y0SyzuYWgEYZ8SxITYa8KTYMqsbrgEb3/view?usp=drivesdk
## 🚀 Overview

IronIQ is an AI-powered fitness application that analyzes workout form in real time using the device camera.

Unlike traditional fitness applications that rely on subscriptions or manual payments, IronIQ introduces an **agentic payment architecture** where the AI agent can autonomously purchase additional AI guidance when it determines that the user needs it.

The project combines:

- Real-time MediaPipe pose estimation
- Local exercise/form analysis
- AI-powered guidance using Google Gemini
- Agentic decision-making
- x402 HTTP payment protocol
- Algorand blockchain
- USDC micro-payments
- Ephemeral session wallets
- Pera Wallet integration

---

## 🧠 Core Concept

The main idea is:

```text
Camera
   ↓
MediaPipe
   ↓
Pose Landmarks
   ↓
Exercise Analyzer
   ↓
Form Score
   ↓
IronIQ Agent
   ↓
Does the user need guidance?
   ↓
YES
   ↓
x402 Payment Request
   ↓
Session Wallet
   ↓
USDC Payment
   ↓
Algorand
   ↓
Payment Verification
   ↓
Gemini AI
   ↓
Personalized Guidance

The agent doesn't continuously charge the user.

It only attempts a payment when it determines that an additional paid capability is useful.

✨ Features
🏋️ Real-Time Form Detection

MediaPipe runs directly in the browser.

It detects body landmarks such as:

Shoulder
Elbow
Wrist
Hip
Knee
Ankle

These landmarks are used to calculate exercise-specific metrics.

Example:

Hip
 ↓
Knee
 ↓
Ankle

The system can calculate the knee angle and use it to determine squat movement and form.

📊 Form Scoring

Exercise-specific analyzers process MediaPipe landmarks.

Example:

Knee Angle:      112°
Hip Angle:        95°
Alignment:       Poor

Form Score:       76%

The form score is calculated locally rather than sending every camera frame to the backend.

🤖 Agentic AI

The IronIQ Agent continuously evaluates the workout state.

For example:

Form Score = 76%
Threshold  = 80%

76 < 80
   ↓
Guidance required

The agent can select an appropriate service:

Text Guidance  → 0.01 USDC
Voice Guidance → 0.02 USDC

The important distinction is:

The agent decides whether a service is useful, while the payment authorization system determines whether the agent is allowed to spend.

💳 Agentic Payment Architecture

IronIQ uses the x402 protocol to connect HTTP APIs with blockchain payments.

                    USER
                      │
                      │ Authorizes session
                      ▼
                PERA WALLET
                      │
                      │ Funds
                      ▼
              SESSION WALLET
                      │
                      │ Signing authority
                      ▼
                IRONIQ AGENT
                      │
                      │ Needs guidance
                      ▼
                 x402 CLIENT
                      │
                      │ HTTP Request
                      ▼
                FLASK BACKEND
                      │
                      │ No payment
                      ▼
              402 PAYMENT REQUIRED
                      │
                      │ Payment requirements
                      ▼
              EXACT AVM SCHEME
                      │
                      │ Construct transaction
                      ▼
                SESSION WALLET
                      │
                      │ Sign
                      ▼
                FACILITATOR
                      │
                Verify + Settle
                      │
                      ▼
                  ALGORAND
                      │
                      ▼
               PAYMENT VERIFIED
                      │
                      ▼
                   GEMINI
                      │
                      ▼
              AI FITNESS GUIDANCE
💰 How Payment Works
Step 1 — User funds the session

The user connects their Pera Wallet.

A temporary Session Wallet is created.

The user approves a limited amount of funds:

Pera Wallet
     │
     │ $0.10 USDC
     ▼
Session Wallet

The agent does not receive unrestricted access to the user's main wallet.

Step 2 — Workout begins

MediaPipe analyzes the user's movement locally.

Camera
  ↓
MediaPipe
  ↓
Landmarks
  ↓
Exercise Analyzer
  ↓
Form Score
Step 3 — Agent decides guidance is needed

Example:

Form Score = 76%
Threshold = 80%

76 < 80

Agent decides:
"Purchase guidance"
Step 4 — Agent requests the paid endpoint
POST /api/agent/text-guidance

The endpoint is protected by x402.

If payment information is missing, the backend responds:

402 Payment Required
Step 5 — x402 creates the payment requirement

The response contains information such as:

Amount:     0.01 USDC
Asset:      USDC
Network:    Algorand
Receiver:   <receiver-address>
Scheme:     Exact

The frontend uses:

@x402/fetch

to handle the payment flow.

Step 6 — Algorand transaction is created

The Exact AVM scheme constructs the required payment.

Conceptually:

From:
Session Wallet

To:
IronIQ Receiver

Asset:
USDC

Amount:
0.01 USDC
Step 7 — Session Wallet signs

The Session Wallet signs the transaction.

Unsigned Transaction
        ↓
Session Wallet
        ↓
Cryptographic Signature
        ↓
Signed Payment

The Gemini model does not have access to the private key.

Step 8 — Facilitator verifies and settles
Signed Payment
      ↓
Facilitator
      ↓
Verification
      ↓
Settlement
      ↓
Algorand

After successful settlement, the payment information is returned to the client/backend.

Step 9 — Backend unlocks the service

The Flask x402 middleware verifies the payment.

Payment Valid?
     │
   YES
     ↓
Allow endpoint
     ↓
Gemini
Step 10 — Gemini generates guidance

Example:

"Keep your knees aligned with your toes
and avoid letting them collapse inward."

The guidance is returned to the frontend.

🔐 Security Model

IronIQ follows the principle:

The agent controls decisions, not unrestricted funds.

A production implementation should enforce:

Maximum transaction
Maximum session budget
Allowed assets
Allowed recipients
Allowed services
Session expiration
Payment rate limits
Emergency disable

Example:

Session Budget:       $0.10
Maximum Transaction:  $0.02
Session Duration:     60 minutes

Allowed Services:
✓ Text Guidance
✓ Voice Guidance

If the agent attempts to exceed these limits, the payment should be rejected.

🔄 Traditional Payment vs Agentic Payment
Traditional
User
 ↓
Click Buy
 ↓
Wallet Popup
 ↓
Approve
 ↓
Payment
 ↓
Service
IronIQ
User
 ↓
Authorize Session Budget
 ↓
Workout
 ↓
Agent detects bad form
 ↓
Agent decides guidance is useful
 ↓
x402 payment challenge
 ↓
Session Wallet signs
 ↓
Algorand settlement
 ↓
AI guidance
🧩 Architecture
Frontend
frontend/
└── src/
    ├── components/
    │   ├── PaymentGate.tsx
    │   ├── SpendingLimitModal.tsx
    │   └── WorkoutCamera.tsx
    │
    ├── hooks/
    │   └── useWorkoutSession.ts
    │
    ├── pages/
    │   └── WorkoutPage.tsx
    │
    ├── services/
    │   ├── agentService.ts
    │   └── sessionWallet.ts
    │
    └── ...
Important frontend files
WorkoutCamera.tsx

Handles:

Camera access
Video stream
MediaPipe processing
Pose landmarks
Real-time visual feedback
useWorkoutSession.ts

Handles:

Exercise state
Rep counting
Form state
Workout lifecycle
Backend communication
agentService.ts

Handles:

Agent decisions
Guidance selection
x402 requests
Payment handling
Payment failure handling
sessionWallet.ts

Handles:

Ephemeral Algorand wallet
Session signer
Transaction signing
SpendingLimitModal.tsx

Handles:

Session authorization
Session funding
Spending configuration
🖥️ Backend
backend/
└── app/
    ├── payment/
    │   └── x402_service.py
    │
    ├── routes/
    │   └── agent.py
    │
    ├── ai/
    │   └── guidance.py
    │
    └── services/
        └── analyzers/
            ├── squat.py
            └── push_up.py
x402_service.py

Responsible for:

x402 configuration
Payment requirements
Protected routes
x402 middleware
Payment enforcement
agent.py

Provides endpoints such as:

POST /api/agent/text-guidance
POST /api/agent/voice-guidance
guidance.py

Handles:

Workout context
Prompt generation
Gemini requests
AI feedback
services/analyzers/

Contains exercise-specific movement analysis.

🛠️ Tech Stack
Frontend
React
TypeScript
Vite
MediaPipe
Algorand SDK
@txnlab/use-wallet-react
@x402/fetch
@x402/avm
Vanilla CSS
Backend
Python
Flask
Google Gemini
x402-avm
Blockchain
Algorand
USDC
x402
Algorand AVM
Wallet
Pera Wallet
Ephemeral Session Wallet
📦 Installation
Clone Repository
git clone <repository-url>
cd IronIQ
Frontend Setup
cd frontend
npm install

Create the required environment file:

cp .env.example .env

Configure the required values:

VITE_BACKEND_URL=http://localhost:5000

Start the frontend:

npm run dev
Backend Setup

Open another terminal:

cd backend

Create a virtual environment:

python -m venv venv

Activate it.

Windows
venv\Scripts\activate
Linux/macOS
source venv/bin/activate

Install dependencies:

pip install -r requirements.txt

Create:

.env

Configure required environment variables:

GEMINI_API_KEY=<your-gemini-api-key>

X402_FACILITATOR_URL=<facilitator-url>

ALGORAND_NETWORK=testnet

USDC_ASSET_ID=10458941

PAYMENT_RECEIVER_ADDRESS=<receiver-address>

Start Flask:

python run.py
🧪 Development Flow

Once both servers are running:

Frontend
http://localhost:5173

        ↓

Backend
http://localhost:5000

        ↓

Connect Pera Wallet

        ↓

Fund Session Wallet

        ↓

Start Workout

        ↓

MediaPipe analyzes form

        ↓

Agent detects form issue

        ↓

x402 payment

        ↓

Algorand TestNet

        ↓

Gemini guidance
💵 Example Session

Suppose the user authorizes:

$0.10 USDC

During the workout:

Text Guidance
$0.01

Voice Guidance
$0.02

Then:

Initial Session Balance = $0.10
Spent                    = $0.03
Remaining                = $0.07

The application can implement a final balance sweep to return unused funds to the user's main wallet.

⚠️ Important Security Notes

This project uses a session-wallet architecture intended for development/testnet use.

For production deployment:

Never expose long-lived private keys.
Use secure signing infrastructure.
Add a formal policy engine.
Enforce transaction limits.
Enforce session spending limits.
Validate recipients.
Validate assets and networks.
Add rate limiting.
Add transaction monitoring.
Add session expiration.
Add emergency payment revocation.
Implement secure unused-balance sweeping.
Audit all payment-related code before mainnet deployment.

The LLM should never directly control a user's private key.

🧠 Why MediaPipe Runs on the Frontend

IronIQ performs high-frequency pose estimation locally.

Instead of:

Camera
 ↓
Internet
 ↓
Backend
 ↓
Pose Model

the system uses:

Camera
 ↓
Browser
 ↓
MediaPipe
 ↓
Pose Landmarks
 ↓
Exercise Analyzer

This provides:

Lower latency
Reduced bandwidth
Lower server costs
Better real-time performance
Improved privacy

Only relevant workout state needs to reach the backend when AI guidance is requested.

🔮 Future Scope
Muscle targeting overlay
Advanced exercise recognition
More exercise analyzers
Personalized workout plans
Adaptive difficulty
Secure production agent wallets
Policy engine
Automatic unused-balance refunds
Agent payment analytics
Multi-provider AI services
Agent-to-agent payments
Mainnet deployment
AI-generated workout programs
🎯 Vision

IronIQ demonstrates how AI agents can move beyond simply generating text and actually interact economically with digital services.

The complete loop is:

PERCEIVE
   ↓
REASON
   ↓
DECIDE
   ↓
PAY
   ↓
USE SERVICE
   ↓
ACT

IronIQ combines this agentic loop with real-time fitness computer vision and blockchain-based micropayments.

IronIQ — An AI fitness coach that doesn't just know when you need help. It can autonomously pay for the help when you need it.
