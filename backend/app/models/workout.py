"""
Workout session dataclasses / typed dicts.

Using plain dicts for JSON-serialisability; dataclasses kept for internal use.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional
import time
import uuid


@dataclass
class WorkoutSession:
    session_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    exercise: str = ""
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    rep_count: int = 0
    correct_reps: int = 0
    incorrect_reps: int = 0
    form_scores: List[float] = field(default_factory=list)
    movement_state: str = "unknown"
    status: str = "active"   # active | completed

    def to_dict(self) -> dict:
        return {
            "sessionId": self.session_id,
            "exercise": self.exercise,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "repCount": self.rep_count,
            "correctReps": self.correct_reps,
            "incorrectReps": self.incorrect_reps,
            "movementState": self.movement_state,
            "status": self.status,
        }


@dataclass
class FrameResult:
    session_id: str
    rep_count: int
    movement_state: str
    form_score: float
    form_feedback: str
    rep_completed: bool

    def to_dict(self) -> dict:
        return {
            "sessionId": self.session_id,
            "repCount": self.rep_count,
            "movementState": self.movement_state,
            "formScore": round(self.form_score, 1),
            "formFeedback": self.form_feedback,
            "repCompleted": self.rep_completed,
        }


@dataclass
class WorkoutReport:
    session_id: str
    exercise: str
    total_reps: int
    correct_reps: int
    incorrect_reps: int
    duration_seconds: float
    average_form_score: float
    previous_reps: int
    improvement_percentage: float

    def to_dict(self) -> dict:
        return {
            "sessionId": self.session_id,
            "exercise": self.exercise,
            "totalReps": self.total_reps,
            "correctReps": self.correct_reps,
            "incorrectReps": self.incorrect_reps,
            "durationSeconds": round(self.duration_seconds, 1),
            "averageFormScore": round(self.average_form_score, 1),
            "previousReps": self.previous_reps,
            "improvementPercentage": round(self.improvement_percentage, 1),
        }
