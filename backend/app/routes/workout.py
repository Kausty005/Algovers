"""
Workout API routes — Agent 2's public surface.

POST /api/workout/start
POST /api/workout/frame
POST /api/workout/end
GET  /api/workout/report/<session_id>

All request/response shapes match docs/API_CONTRACT.md exactly.
"""
from __future__ import annotations

import logging
from flask import Blueprint, request, jsonify, Response

from app.services import session_service, report_service
from app.services.exercise_service import list_exercises
from app.models.workout import FrameResult

logger = logging.getLogger(__name__)

workout_bp = Blueprint("workout", __name__, url_prefix="/api/workout")


def _error(msg: str, status: int = 400) -> Response:
    return jsonify({"error": msg}), status


# ---------------------------------------------------------------------------
# POST /api/workout/start
# ---------------------------------------------------------------------------
@workout_bp.post("/start")
def start_workout() -> Response:
    """
    Start a new workout session.

    Request JSON:
        { "exercise": "squat" }

    Response JSON:
        { "sessionId": "...", "exercise": "squat", "status": "active" }
    """
    data = request.get_json(silent=True) or {}
    exercise = (data.get("exercise") or "").strip().lower()

    if not exercise:
        return _error("'exercise' is required.")

    if exercise not in list_exercises():
        return _error(
            f"Unsupported exercise '{exercise}'. Choose from: {list_exercises()}"
        )

    try:
        session = session_service.create_session(exercise)
    except Exception as exc:
        logger.exception("Failed to create session")
        return _error(str(exc), 500)

    return jsonify(session.to_dict()), 201


# ---------------------------------------------------------------------------
# POST /api/workout/frame
# ---------------------------------------------------------------------------
@workout_bp.post("/frame")
def process_frame() -> Response:
    """
    Process a single frame of MediaPipe landmarks.

    Request JSON:
        {
          "sessionId": "abc123",
          "landmarks": [
            { "x": 0.5, "y": 0.3, "z": 0.0, "visibility": 0.99 },
            ...
          ]
        }

    Response JSON:
        {
          "sessionId": "abc123",
          "repCount": 7,
          "movementState": "ascending",
          "formScore": 86.0,
          "formFeedback": "Keep your knees aligned.",
          "repCompleted": true
        }
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("sessionId", "").strip()
    landmarks = data.get("landmarks", [])
    image_b64 = data.get("image", "")

    if not session_id:
        return _error("'sessionId' is required.")

    # If frontend didn't send pre-extracted landmarks, but sent a raw image, extract them here
    if (not landmarks or len(landmarks) == 0) and image_b64:
        from app.services.pose_service import extract_landmarks_from_b64
        landmarks = extract_landmarks_from_b64(image_b64)

    if not isinstance(landmarks, list) or len(landmarks) < 1:
        return _error("'landmarks' must be a non-empty list (or valid 'image' must be provided).")

    session = session_service.get_session(session_id)
    if session is None:
        return _error(f"Session '{session_id}' not found.", 404)
    if session.status != "active":
        return _error(f"Session '{session_id}' is not active.")

    analyzer = session_service.get_analyzer_for_session(session_id)
    if analyzer is None:
        return _error("Analyzer not found for session.", 500)

    try:
        rep_completed, movement_state, form_score, form_feedback = analyzer.analyze(
            landmarks
        )
    except Exception as exc:
        logger.exception("Frame analysis error")
        return _error(f"Frame analysis failed: {exc}", 500)

    # Sync session state
    session.rep_count = analyzer.rep_count
    session.correct_reps = analyzer.correct_reps
    session.incorrect_reps = analyzer.incorrect_reps
    session.movement_state = movement_state
    session.form_scores.append(form_score)

    result = FrameResult(
        session_id=session_id,
        rep_count=session.rep_count,
        movement_state=movement_state,
        form_score=form_score,
        form_feedback=form_feedback,
        rep_completed=rep_completed,
    )
    return jsonify(result.to_dict())


# ---------------------------------------------------------------------------
# POST /api/workout/end
# ---------------------------------------------------------------------------
@workout_bp.post("/end")
def end_workout() -> Response:
    """
    End a workout session.

    Request JSON:
        { "sessionId": "abc123" }

    Response JSON:
        { "sessionId": "abc123", "status": "completed" }
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("sessionId", "").strip()

    if not session_id:
        return _error("'sessionId' is required.")

    session = session_service.end_session(session_id)
    if session is None:
        return _error(f"Session '{session_id}' not found.", 404)

    return jsonify({"sessionId": session.session_id, "status": session.status})


# ---------------------------------------------------------------------------
# GET /api/workout/report/<session_id>
# ---------------------------------------------------------------------------
@workout_bp.get("/report/<session_id>")
def get_report(session_id: str) -> Response:
    """
    Return the full workout report for a completed session.

    Response JSON matches docs/API_CONTRACT.md WorkoutReport shape.
    """
    session = session_service.get_session(session_id)
    if session is None:
        return _error(f"Session '{session_id}' not found.", 404)

    if session.status != "completed":
        return _error(
            f"Session '{session_id}' is still active. Call /api/workout/end first.",
            400,
        )

    report = report_service.build_report(session)
    return jsonify(report.to_dict())
