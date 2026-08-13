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
    data = db.workouts.find_one({"sessionId": session_id})
    if data:
        session = WorkoutSession(
            session_id=data.get("sessionId", ""),
            user_id=data.get("userId", ""),
            exercise=data.get("exercise", ""),
            start_time=data.get("startTime", 0.0),
            end_time=data.get("endTime"),
            rep_count=data.get("repCount", 0),
            correct_reps=data.get("correctReps", 0),
            incorrect_reps=data.get("incorrectReps", 0),
            form_scores=data.get("formScores", []),
            movement_state=data.get("movementState", "unknown"),
            status=data.get("status", "completed")
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
    cursor = db.workouts.find({"exercise": exercise, "userId": user_id, "status": "completed"})
    sessions = []
    for data in cursor:
        sessions.append(WorkoutSession(
            session_id=data.get("sessionId", ""),
            user_id=data.get("userId", ""),
            exercise=data.get("exercise", ""),
            start_time=data.get("startTime", 0.0),
            end_time=data.get("endTime"),
            rep_count=data.get("repCount", 0),
            correct_reps=data.get("correctReps", 0),
            incorrect_reps=data.get("incorrectReps", 0),
            form_scores=data.get("formScores", []),
            movement_state=data.get("movementState", "unknown"),
            status=data.get("status", "completed")
        ))
    return sessions

def get_user_dashboard_stats(user_id: str) -> dict:
    """Get aggregated stats for the user's dashboard."""
    db = get_db()
    workouts = list(db.workouts.find({"userId": user_id, "status": "completed"}))
    
    total_workouts = len(workouts)
    total_reps = sum(w.get("repCount", 0) for w in workouts)
    total_duration = sum((w.get("endTime", 0) - w.get("startTime", 0)) for w in workouts)
    
    return {
        "totalWorkouts": total_workouts,
        "totalReps": total_reps,
        "totalDurationMinutes": round(total_duration / 60, 1) if total_duration > 0 else 0,
        "recentWorkouts": [
            {
                "id": w.get("sessionId", ""),
                "exercise": w.get("exercise", ""),
                "reps": w.get("repCount", 0),
                "date": w.get("startTime", 0)
            }
            for w in sorted(workouts, key=lambda x: x.get("startTime", 0), reverse=True)[:5]
        ]
    }
