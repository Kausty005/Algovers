"""
Abstract base class for exercise analyzers.

Each exercise analyzer owns:
  - angle calculation for its relevant joints
  - state machine logic (movement states)
  - rep counting
  - basic form checks
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Tuple

from app.services.pose_service import Landmarks


class ExerciseAnalyzer(ABC):
    """
    Base class for all exercise analyzers.

    Subclasses must implement `analyze` which takes a list of MediaPipe
    landmarks and returns (rep_completed, movement_state, form_score, form_feedback).
    """

    def __init__(self) -> None:
        self.rep_count: int = 0
        self.movement_state: str = "unknown"
        self.correct_reps: int = 0
        self.incorrect_reps: int = 0
        self._last_form_score: float = 100.0

    @abstractmethod
    def analyze(
        self, landmarks: Landmarks
    ) -> Tuple[bool, str, float, str]:
        """
        Analyze a single frame of landmarks.

        Returns:
            (rep_completed, movement_state, form_score, form_feedback)
        """
        ...

    def reset(self) -> None:
        """Reset state for a new session."""
        self.rep_count = 0
        self.movement_state = "unknown"
        self.correct_reps = 0
        self.incorrect_reps = 0
        self._last_form_score = 100.0
