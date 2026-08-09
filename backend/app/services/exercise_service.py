"""
Exercise service — factory that returns the correct analyzer.
"""
from __future__ import annotations

from app.services.analyzers.base import ExerciseAnalyzer
from app.services.analyzers.squat import SquatAnalyzer
from app.services.analyzers.bicep_curl import BicepCurlAnalyzer
from app.services.analyzers.push_up import PushUpAnalyzer

SUPPORTED_EXERCISES = {
    "squat": SquatAnalyzer,
    "bicep_curl": BicepCurlAnalyzer,
    "push_up": PushUpAnalyzer,
}


def get_analyzer(exercise: str) -> ExerciseAnalyzer:
    """
    Return a fresh ExerciseAnalyzer instance for the given exercise name.

    Raises ValueError for unknown exercises.
    """
    key = exercise.lower().strip()
    cls = SUPPORTED_EXERCISES.get(key)
    if cls is None:
        raise ValueError(
            f"Unknown exercise '{exercise}'. Supported: {list(SUPPORTED_EXERCISES)}"
        )
    return cls()


def list_exercises() -> list[str]:
    return list(SUPPORTED_EXERCISES.keys())
