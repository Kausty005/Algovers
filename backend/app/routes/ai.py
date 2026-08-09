"""
Gym Buddy — AI Routes Blueprint (Agent 3)
Owns: POST /api/ai/guidance, /api/ai/motivation, /api/ai/chat, /api/ai/voice
"""

from __future__ import annotations

import logging
from flask import Blueprint, request, jsonify, Response

from ..ai.guidance import guidance_ai
from ..ai.motivation import motivation_ai
from ..ai.chatbot import chatbot_ai
from ..ai.tts import tts_service

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


def _bad_request(message: str):
    return jsonify({"error": message}), 400


def _server_error(message: str):
    return jsonify({"error": message}), 500


# ---------------------------------------------------------------------------
# POST /api/ai/guidance
# ---------------------------------------------------------------------------

@ai_bp.route("/guidance", methods=["POST"])
def guidance():
    """Real-time coaching cue from CV workout facts.

    Request:
        {
            "exercise": "squat",
            "repCount": 8,
            "formScore": 78,
            "formFeedback": "Knees moving inward",
            "movementState": "bottom"
        }

    Response:
        { "text": "Keep your knees aligned.", "priority": "high" }
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
        return jsonify(result), 200
    except Exception as exc:
        logger.exception("Guidance error")
        return _server_error(f"AI guidance error: {exc}")


# ---------------------------------------------------------------------------
# POST /api/ai/motivation
# ---------------------------------------------------------------------------

@ai_bp.route("/motivation", methods=["POST"])
def motivation():
    """Short motivational phrase keyed to workout progress.

    Request:
        { "exercise": "squat", "repCount": 8, "targetReps": 12, "formScore": 88 }

    Response:
        { "text": "Great work! Four more reps!" }
    """
    data = request.get_json(silent=True) or {}

    exercise = data.get("exercise", "")
    rep_count = int(data.get("repCount", 0))
    target_reps = int(data.get("targetReps", 12))
    form_score = int(data.get("formScore", 100))

    try:
        result = motivation_ai.get_motivation(
            exercise=exercise,
            rep_count=rep_count,
            target_reps=target_reps,
            form_score=form_score,
        )
        return jsonify(result), 200
    except Exception as exc:
        logger.exception("Motivation error")
        return _server_error(f"AI motivation error: {exc}")


# ---------------------------------------------------------------------------
# POST /api/ai/chat
# ---------------------------------------------------------------------------

@ai_bp.route("/chat", methods=["POST"])
def chat():
    """Fitness chatbot endpoint with credit enforcement.

    Request:  { "message": "How can I improve my squat?", "sessionId": "chat-123" }
    Response: { "response": "Focus on keeping your knees aligned...", "creditsRemaining": 9 }
    """
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    session_id = str(data.get("sessionId", "")).strip()

    if not message:
        return _bad_request("Missing required field: message")
    if not session_id:
        return _bad_request("Missing required field: sessionId")

    from ..services.credit_service import get_credits, deduct_credit
    
    session_data = get_credits(session_id)
    if not session_data or session_data["credits"] <= 0:
        return jsonify({"error": "Insufficient credits", "code": "NO_CREDITS"}), 403

    model_name = session_data["model_name"]
    
    # Deduct credit before processing (or after, but before is safer)
    if not deduct_credit(session_id):
        return jsonify({"error": "Insufficient credits", "code": "NO_CREDITS"}), 403

    try:
        result = chatbot_ai.chat(message, model_name=model_name)
        result["creditsRemaining"] = session_data["credits"] - 1
        return jsonify(result), 200
    except Exception as exc:
        logger.exception("Chat error")
        # Refund credit if AI failed
        from ..services.credit_service import add_credits
        add_credits(session_id, 1, model_name, session_data["tier"])
        return _server_error(f"Chat error: {exc}")


# ---------------------------------------------------------------------------
# POST /api/ai/voice
# ---------------------------------------------------------------------------

@ai_bp.route("/voice", methods=["POST"])
def voice():
    """Text-to-speech endpoint. Returns MP3 audio bytes.

    Request:  { "text": "Great work! Keep going!" }
    Response: audio/mpeg bytes
    """
    data = request.get_json(silent=True) or {}
    text = str(data.get("text", "")).strip()

    if not text:
        return _bad_request("Missing required field: text")

    try:
        audio_bytes = tts_service.synthesize(text)
        return Response(
            audio_bytes,
            status=200,
            mimetype="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="voice.mp3"',
                "Content-Length": str(len(audio_bytes)),
            },
        )
    except ValueError as exc:
        return _bad_request(str(exc))
    except RuntimeError as exc:
        logger.exception("TTS error")
        return _server_error(str(exc))
    except Exception as exc:
        logger.exception("Unexpected TTS error")
        return _server_error(f"Voice generation error: {exc}")
