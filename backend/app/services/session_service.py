"""
Session service — in-memory store for active and completed workout sessions.

For the MVP this is an in-memory dict.  Adding a DB later only requires
replacing this module without touching the routes.
"""
from __future__ import annotations

from typing import Dict, Optional
from app.models.workout import WorkoutSession
from app.services.exercise_service import get_analyzer
from app.services.analyzers.base import ExerciseAnalyzer

# In-memory stores
_sessions: Dict[str, WorkoutSession] = {}
_analyzers: Dict[str, ExerciseAnalyzer] = {}


def create_session(exercise: str) -> WorkoutSession:
    """Create and persist a new workout session."""
    session = WorkoutSession(exercise=exercise)
    analyzer = get_analyzer(exercise)
    _sessions[session.session_id] = session
    _analyzers[session.session_id] = analyzer
    return session


def get_session(session_id: str) -> Optional[WorkoutSession]:
    return _sessions.get(session_id)


def get_analyzer_for_session(session_id: str) -> Optional[ExerciseAnalyzer]:
    return _analyzers.get(session_id)


def end_session(session_id: str) -> Optional[WorkoutSession]:
    """Mark a session as completed and record end time."""
    import time
    session = _sessions.get(session_id)
    if session is None:
        return None
    session.status = "completed"
    session.end_time = time.time()
    return session


def list_completed_sessions_for_exercise(exercise: str) -> list[WorkoutSession]:
    """Return all completed sessions for a given exercise (for improvement calc)."""
    return [
        s for s in _sessions.values()
        if s.exercise == exercise and s.status == "completed"
    ]
