"""
IronIQ — Agent Routes Blueprint
x402-protected endpoints for agentic AI guidance purchases.

POST /api/agent/text-guidance  — $0.01 USDC — AI text coaching cue
POST /api/agent/voice-guidance — $0.02 USDC — AI text + TTS voice coaching

These endpoints are protected by x402 middleware. The IronIQ frontend
agent automatically pays for them using a session wallet when the user's
form score drops below 50% for 30+ seconds.
"""

from __future__ import annotations

import logging
from flask import Blueprint, request, jsonify, Response

from ..ai.guidance import guidance_ai
from ..ai.tts import tts_service

logger = logging.getLogger(__name__)

agent_bp = Blueprint("agent", __name__, url_prefix="/api/agent")


def _bad_request(message: str):
    return jsonify({"error": message}), 400


def _server_error(message: str):
    return jsonify({"error": message}), 500


# ---------------------------------------------------------------------------
# POST /api/agent/text-guidance  ($0.01 USDC — x402 protected)
# ---------------------------------------------------------------------------

@agent_bp.route("/text-guidance", methods=["POST"])
def agent_text_guidance():
    """Agent-purchased text guidance.

    Protected by x402 middleware — the frontend session wallet signs
    the payment automatically without user interaction.

    Request:
        {
            "exercise": "squat",
            "repCount": 8,
            "formScore": 42,
            "formFeedback": "Knees moving inward",
            "movementState": "bottom"
        }

    Response:
        {
            "text": "Keep your knees aligned with toes.",
            "priority": "high",
            "transactionId": "ALGORAND_TX_ID",
            "service": "text-guidance",
            "cost": "0.01"
        }
    """
    data = request.get_json(silent=True) or {}

    exercise = data.get("exercise", "")
    if not exercise:
        return _bad_request("Missing required field: exercise")

    rep_count = int(data.get("repCount", 0))
    form_score = int(data.get("formScore", 100))
    form_feedback = str(data.get("formFeedback", ""))
    movement_state = str(data.get("movementState", "unknown"))

    try:
        result = guidance_ai.get_guidance(
            exercise=exercise,
            rep_count=rep_count,
            form_score=form_score,
            form_feedback=form_feedback,
            movement_state=movement_state,
        )

        # Attach the transaction ID from the x402 middleware
        x_payment = request.headers.get("X-PAYMENT", "")

        return jsonify({
            "text": result["text"],
            "priority": result["priority"],
            "transactionId": x_payment,
            "service": "text-guidance",
            "cost": "0.01",
        }), 200
    except Exception as exc:
        logger.exception("Agent text guidance error")
        return _server_error(f"Agent guidance error: {exc}")


# ---------------------------------------------------------------------------
# POST /api/agent/voice-guidance  ($0.02 USDC — x402 protected)
# ---------------------------------------------------------------------------

@agent_bp.route("/voice-guidance", methods=["POST"])
def agent_voice_guidance():
    """Agent-purchased voice guidance (text + TTS audio).

    Protected by x402 middleware — the frontend session wallet signs
    the payment automatically without user interaction.

    Request:
        {
            "exercise": "squat",
            "repCount": 8,
            "formScore": 38,
            "formFeedback": "Back rounding detected",
            "movementState": "bottom"
        }

    Response:
        {
            "text": "Straighten your back, engage your core.",
            "priority": "high",
            "transactionId": "ALGORAND_TX_ID",
            "service": "voice-guidance",
            "cost": "0.02",
            "audioBase64": "//uQx...",
            "audioMimeType": "audio/mpeg"
        }
    """
    data = request.get_json(silent=True) or {}

    exercise = data.get("exercise", "")
    if not exercise:
        return _bad_request("Missing required field: exercise")

    rep_count = int(data.get("repCount", 0))
    form_score = int(data.get("formScore", 100))
    form_feedback = str(data.get("formFeedback", ""))
    movement_state = str(data.get("movementState", "unknown"))

    try:
        # 1. Generate text guidance
        result = guidance_ai.get_guidance(
            exercise=exercise,
            rep_count=rep_count,
            form_score=form_score,
            form_feedback=form_feedback,
            movement_state=movement_state,
        )

        # 2. Generate TTS audio
        import base64
        audio_bytes = tts_service.synthesize(result["text"])
        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")

        # Attach the transaction ID from the x402 middleware
        x_payment = request.headers.get("X-PAYMENT", "")

        return jsonify({
            "text": result["text"],
            "priority": result["priority"],
            "transactionId": x_payment,
            "service": "voice-guidance",
            "cost": "0.02",
            "audioBase64": audio_b64,
            "audioMimeType": "audio/mpeg",
        }), 200
    except Exception as exc:
        logger.exception("Agent voice guidance error")
        return _server_error(f"Agent voice guidance error: {exc}")
