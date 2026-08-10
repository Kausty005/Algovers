"""
Session service — handles active workout sessions in memory, saves completed to MongoDB.
"""
from __future__ import annotations

from typing import Dict, Optional, List
from app.models.workout import WorkoutSession
from app.services.exercise_service import get_analyzer
from app.services.analyzers.base import ExerciseAnalyzer
from app.db import get_db

# In-memory stores for active sessions
_sessions: Dict[str, WorkoutSession] = {}
_analyzers: Dict[str, ExerciseAnalyzer] = {}


def create_session(exercise: str, user_id: str) -> WorkoutSession:
    """Create and persist a new workout session."""
    session = WorkoutSession(exercise=exercise, user_id=user_id)
    analyzer = get_analyzer(exercise)
    _sessions[session.session_id] = session
    _analyzers[session.session_id] = analyzer
    return session


def get_session(session_id: str) -> Optional[WorkoutSession]:
    # Check in-memory first
    if session_id in _sessions:
        return _sessions[session_id]
        
    # If not in memory, check MongoDB for completed sessions
    db = get_db()
    data = db.workouts.find_one({"session_id": session_id})
    if data:
        session = WorkoutSession(
            session_id=data["session_id"],
            user_id=data.get("user_id", ""),
            exercise=data["exercise"],
            start_time=data["start_time"],
            end_time=data["end_time"],
            rep_count=data["rep_count"],
            correct_reps=data["correct_reps"],
            incorrect_reps=data["incorrect_reps"],
            form_scores=data["form_scores"],
            movement_state=data["movement_state"],
            status=data["status"]
        )
        return session
    return None


def get_analyzer_for_session(session_id: str) -> Optional[ExerciseAnalyzer]:
    return _analyzers.get(session_id)


def end_session(session_id: str) -> Optional[WorkoutSession]:
    """Mark a session as completed, record end time, and save to DB."""
    import time
    session = _sessions.get(session_id)
    if session is None:
        return None
        
    session.status = "completed"
    session.end_time = time.time()
    
    # Save to MongoDB
    db = get_db()
    db.workouts.insert_one(session.to_dict())
    
    # Clean up memory
    _sessions.pop(session_id, None)
    _analyzers.pop(session_id, None)
    
    return session


def list_completed_sessions_for_exercise(exercise: str, user_id: str) -> List[WorkoutSession]:
    """Return all completed sessions for a given exercise and user (for improvement calc)."""
    db = get_db()
    cursor = db.workouts.find({"exercise": exercise, "user_id": user_id, "status": "completed"})
    sessions = []
    for data in cursor:
        sessions.append(WorkoutSession(
            session_id=data["session_id"],
            user_id=data.get("user_id", ""),
            exercise=data["exercise"],
            start_time=data["start_time"],
            end_time=data["end_time"],
            rep_count=data["rep_count"],
            correct_reps=data["correct_reps"],
            incorrect_reps=data["incorrect_reps"],
            form_scores=data["form_scores"],
            movement_state=data["movement_state"],
            status=data["status"]
        ))
    return sessions

def get_user_dashboard_stats(user_id: str) -> dict:
    """Get aggregated stats for the user's dashboard."""
    db = get_db()
    workouts = list(db.workouts.find({"user_id": user_id, "status": "completed"}))
    
    total_workouts = len(workouts)
    total_reps = sum(w.get("rep_count", 0) for w in workouts)
    total_duration = sum((w.get("end_time", 0) - w.get("start_time", 0)) for w in workouts)
    
    return {
        "totalWorkouts": total_workouts,
        "totalReps": total_reps,
        "totalDurationMinutes": round(total_duration / 60, 1),
        "recentWorkouts": [
            {
                "id": w["session_id"],
                "exercise": w["exercise"],
                "reps": w["rep_count"],
                "date": w["start_time"]
            }
            for w in sorted(workouts, key=lambda x: x["start_time"], reverse=True)[:5]
        ]
    }
