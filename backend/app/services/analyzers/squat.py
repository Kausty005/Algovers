"""
Squat analyzer.

State machine:
    STANDING  ──→  DESCENDING  ──→  BOTTOM  ──→  ASCENDING  ──→  STANDING  (+1 rep)

Key joint: hip–knee–ankle angle (knee angle).

Thresholds (degrees):
    BOTTOM when knee_angle < BOTTOM_THRESHOLD   (≈ 90°  — thighs parallel)
    STANDING when knee_angle > STAND_THRESHOLD  (≈ 160° — nearly straight)

Hysteresis prevents flip-flopping near the boundary.
"""
from __future__ import annotations
from typing import Tuple

from app.services.analyzers.base import ExerciseAnalyzer
from app.services.pose_service import Landmarks, LandmarkIndex, get_landmark
from app.utils.angles import calculate_angle


# ------------------------------------------------------------------
# Thresholds
# ------------------------------------------------------------------
STAND_THRESHOLD = 160   # knee angle above this → STANDING
BOTTOM_THRESHOLD = 100  # knee angle below this → BOTTOM
DEPTH_THRESHOLD = 110   # minimum depth for a "correct" squat


class SquatAnalyzer(ExerciseAnalyzer):
    """
    Analyzes squat repetitions using the hip-knee-ankle angle on both sides.
    Falls back to whichever side has better visibility.
    """

    # States
    STANDING = "standing"
    DESCENDING = "descending"
    BOTTOM = "bottom"
    ASCENDING = "ascending"

    def __init__(self) -> None:
        super().__init__()
        self.movement_state = self.STANDING
        self._deepest_angle: float = 180.0  # track depth per rep

    def reset(self) -> None:
        super().reset()
        self.movement_state = self.STANDING
        self._deepest_angle = 180.0

    def _get_knee_angle(self, landmarks: Landmarks) -> Tuple[float, bool]:
        """
        Returns (angle, ok).  Tries left side first, then right.
        """
        for hip_idx, knee_idx, ankle_idx in [
            (LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_KNEE, LandmarkIndex.LEFT_ANKLE),
            (LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_KNEE, LandmarkIndex.RIGHT_ANKLE),
        ]:
            hip = get_landmark(landmarks, hip_idx)
            knee = get_landmark(landmarks, knee_idx)
            ankle = get_landmark(landmarks, ankle_idx)
            if hip and knee and ankle:
                return calculate_angle(hip, knee, ankle), True
        return 180.0, False

    def _form_check(self, knee_angle: float) -> Tuple[float, str]:
        """Basic form checks. Returns (score 0-100, feedback string)."""
        score = 100.0
        feedback = "Good form."

        if self.movement_state == self.BOTTOM:
            if self._deepest_angle > DEPTH_THRESHOLD:
                score -= 20
                feedback = "Go slightly deeper."
        return score, feedback

    def analyze(self, landmarks: Landmarks) -> Tuple[bool, str, float, str]:
        """Process one frame. Returns (rep_completed, state, form_score, feedback)."""
        knee_angle, ok = self._get_knee_angle(landmarks)
        if not ok:
            return False, self.movement_state, self._last_form_score, "Body not fully visible."

        rep_completed = False
        prev_state = self.movement_state

        # --- State machine ---
        if self.movement_state == self.STANDING:
            if knee_angle <= BOTTOM_THRESHOLD + 20:   # start descending
                self.movement_state = self.DESCENDING
                self._deepest_angle = knee_angle

        elif self.movement_state == self.DESCENDING:
            self._deepest_angle = min(self._deepest_angle, knee_angle)
            if knee_angle <= BOTTOM_THRESHOLD:
                self.movement_state = self.BOTTOM

        elif self.movement_state == self.BOTTOM:
            self._deepest_angle = min(self._deepest_angle, knee_angle)
            if knee_angle >= BOTTOM_THRESHOLD + 10:   # hysteresis gap
                self.movement_state = self.ASCENDING

        elif self.movement_state == self.ASCENDING:
            if knee_angle >= STAND_THRESHOLD:
                self.movement_state = self.STANDING
                self.rep_count += 1
                rep_completed = True
                # Score the completed rep
                if self._deepest_angle <= DEPTH_THRESHOLD:
                    self.correct_reps += 1
                else:
                    self.incorrect_reps += 1
                self._deepest_angle = 180.0  # reset for next rep

        # Form score & feedback
        form_score, feedback = self._form_check(knee_angle)
        self._last_form_score = form_score
        return rep_completed, self.movement_state, form_score, feedback
