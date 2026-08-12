"""
Gym Buddy — Payment Routes Blueprint (Agent 3)
Owns: GET /api/payment/status, POST /api/payment/session

POST /api/payment/session is wrapped by the x402 middleware.
If the middleware passes the request through (payment verified),
this handler creates the workout payment record and returns session info.
"""

from __future__ import annotations

import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..payment.algorand_service import algorand_service

logger = logging.getLogger(__name__)

payment_bp = Blueprint("payment", __name__, url_prefix="/api/payment")


# ---------------------------------------------------------------------------
# GET /api/payment/status
# ---------------------------------------------------------------------------

@payment_bp.route("/status", methods=["GET"])
def payment_status():
    """Return current payment status for the most recent session.

    Response:
        {
            "status": "idle" | "required" | "processing" | "verified" | "failed",
            "sessionId": "pay-abc123" | null,
            "network": "algorand-testnet",
            "price": "0.1",
            "asset": "ALGO",
            "receiverAddress": "ALGO_ADDRESS..."
        }
    """
    status = algorand_service.get_current_status()
    return jsonify(status), 200


# ---------------------------------------------------------------------------
# POST /api/payment/session
# GET /api/payment/check
# (x402 middleware intercepts these BEFORE they reach here)
# ---------------------------------------------------------------------------

@payment_bp.route("/check", methods=["GET"])
@jwt_required()
def payment_check():
    """Verify payment status for the Workout session.
    
    Returns 200 OK if payment is valid/provided.
    Returns 402 via middleware if payment is required.
    """
    return jsonify({"status": "verified"}), 200


@payment_bp.route("/session", methods=["POST"])
@jwt_required()
def payment_session():
    """Create / verify a payment session.

    This endpoint is wrapped by the x402 WSGI middleware:
      - Request WITHOUT valid payment → middleware returns HTTP 402
      - Request WITH valid payment   → middleware forwards here → HTTP 200

    Request:
        { "exercise": "squat" }

    Response (on verified payment):
        {
            "sessionId": "pay-abc123",
            "paymentAddress": "ALGORAND_ADDRESS...",
            "amount": "0.1",
            "asset": "ALGO",
            "network": "algorand-testnet",
            "status": "verified"
        }
    """
    data = request.get_json(silent=True) or {}
    exercise = str(data.get("exercise", "squat"))

    # Create a new payment session record
    session = algorand_service.create_payment_session(exercise)

    # Mark as verified — if we reached this handler the x402 middleware
    # has already confirmed the payment (or demo mode passed it through).
    x_payment = request.headers.get("X-PAYMENT", "")
    algorand_service.mark_verified(session.session_id, tx_id=x_payment or None)

    logger.info(
        "Payment session %s verified for exercise=%s (X-PAYMENT header present)",
        session.session_id,
        exercise,
    )

    return jsonify({
        "sessionId": session.session_id,
        "paymentAddress": session.payment_address,
        "amount": session.amount,
        "asset": session.asset,
        "network": session.network,
        "status": "verified",
        "transactionId": x_payment or "",
    }), 200


# ---------------------------------------------------------------------------
# POST /api/payment/verify  (optional — manual TX check)
# ---------------------------------------------------------------------------

@payment_bp.route("/verify", methods=["POST"])
def verify_tx():
    """Manually verify an Algorand transaction by TX ID.

    Useful for the frontend to confirm a payment before starting a workout.

    Request:  { "sessionId": "pay-abc123", "txId": "ALGORAND_TX_ID" }
    Response: { "verified": true | false, "sessionId": "pay-abc123" }
    """
    data = request.get_json(silent=True) or {}
    session_id = str(data.get("sessionId", "")).strip()
    tx_id = str(data.get("txId", "")).strip()

    if not session_id:
        return jsonify({"error": "Missing required field: sessionId"}), 400
    if not tx_id:
        return jsonify({"error": "Missing required field: txId"}), 400

    session = algorand_service.get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    # Check on-chain
    confirmed = algorand_service.check_on_chain_tx(tx_id)
    if confirmed:
        algorand_service.mark_verified(session_id, tx_id=tx_id)
    else:
        algorand_service.mark_failed(session_id)

    return jsonify({
        "verified": confirmed,
        "sessionId": session_id,
    }), 200

# ---------------------------------------------------------------------------
# POST /api/payment/ai-credits/<tier>
# (x402 middleware intercepts this BEFORE it reaches here)
# ---------------------------------------------------------------------------

@payment_bp.route("/ai-credits/<tier>", methods=["POST"])
@jwt_required()
def payment_ai_credits(tier: str):
    """Buy AI credits.
    Protected by x402 middleware.
    """
    from ..payment.x402_service import PROTECTED_AI_PATHS
    path = f"/api/payment/ai-credits/{tier}"
    if path not in PROTECTED_AI_PATHS:
        return jsonify({"error": "Invalid tier"}), 400

    data = request.get_json(silent=True) or {}
    session_id = str(data.get("sessionId", "")).strip()
    if not session_id:
        return jsonify({"error": "sessionId is required"}), 400

    # If we reached here, payment is verified. Add 10 credits.
    from ..services.credit_service import add_credits
    tier_info = PROTECTED_AI_PATHS[path]
    
    user_id = get_jwt_identity()
    session_data = add_credits(
        user_id=user_id,
        amount=10,
        model_name=tier_info["model"],
        tier=tier
    )

    return jsonify({
        "sessionId": session_id,
        "credits": session_data["credits"],
        "model": session_data["model_name"],
        "tier": session_data["tier"],
        "status": "verified",
        "transactionId": request.headers.get("X-PAYMENT", "")
    }), 200
