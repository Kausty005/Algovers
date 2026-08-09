"""
Bicep Curl analyzer.

State machine:
    DOWN  ──→  CURLING  ──→  TOP  ──→  LOWERING  ──→  DOWN  (+1 rep)

Key joint: shoulder–elbow–wrist angle (elbow angle).

Thresholds (degrees):
    TOP  when elbow_angle < TOP_THRESHOLD    (≈ 50°  — full curl)
    DOWN when elbow_angle > DOWN_THRESHOLD   (≈ 150° — arm extended)
"""
from __future__ import annotations
from typing import Tuple

from app.services.analyzers.base import ExerciseAnalyzer
from app.services.pose_service import Landmarks, LandmarkIndex, get_landmark
from app.utils.angles import calculate_angle


# Thresholds
DOWN_THRESHOLD = 150   # elbow angle → arm extended
TOP_THRESHOLD = 60     # elbow angle → fully curled
FULL_RANGE_REQUIRED = True  # rep only counts if full range achieved


class BicepCurlAnalyzer(ExerciseAnalyzer):
    """Analyzes bicep curl repetitions."""

    DOWN = "down"
    CURLING = "curling"
    TOP = "top"
    LOWERING = "lowering"

    def __init__(self) -> None:
        super().__init__()
        self.movement_state = self.DOWN
        self._achieved_top = False   # did this rep reach TOP?

    def reset(self) -> None:
        super().reset()
        self.movement_state = self.DOWN
        self._achieved_top = False

    def _get_elbow_angle(self, landmarks: Landmarks) -> Tuple[float, bool]:
        """Try left arm first, then right."""
        for shoulder_idx, elbow_idx, wrist_idx in [
            (LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW, LandmarkIndex.LEFT_WRIST),
            (LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW, LandmarkIndex.RIGHT_WRIST),
        ]:
            s = get_landmark(landmarks, shoulder_idx)
            e = get_landmark(landmarks, elbow_idx)
            w = get_landmark(landmarks, wrist_idx)
            if s and e and w:
                return calculate_angle(s, e, w), True
        return 180.0, False

    def _form_check(self, elbow_angle: float) -> Tuple[float, str]:
        score = 100.0
        feedback = "Good form."
        if self.movement_state == self.TOP and elbow_angle > TOP_THRESHOLD + 15:
            score -= 15
            feedback = "Curl higher for full range."
        if self.movement_state in (self.DOWN, self.LOWERING) and elbow_angle < DOWN_THRESHOLD - 20:
            score -= 10
            feedback = "Lower fully to complete the rep."
        return score, feedback

    def analyze(self, landmarks: Landmarks) -> Tuple[bool, str, float, str]:
        elbow_angle, ok = self._get_elbow_angle(landmarks)
        if not ok:
            return False, self.movement_state, self._last_form_score, "Arm not visible."

        rep_completed = False

        if self.movement_state == self.DOWN:
            if elbow_angle <= DOWN_THRESHOLD - 10:
                self.movement_state = self.CURLING

        elif self.movement_state == self.CURLING:
            if elbow_angle <= TOP_THRESHOLD:
                self.movement_state = self.TOP
                self._achieved_top = True

        elif self.movement_state == self.TOP:
            if elbow_angle >= TOP_THRESHOLD + 10:
                self.movement_state = self.LOWERING

        elif self.movement_state == self.LOWERING:
            if elbow_angle >= DOWN_THRESHOLD:
                self.movement_state = self.DOWN
                self.rep_count += 1
                rep_completed = True
                if self._achieved_top:
                    self.correct_reps += 1
                else:
                    self.incorrect_reps += 1
                self._achieved_top = False

        form_score, feedback = self._form_check(elbow_angle)
        self._last_form_score = form_score
        return rep_completed, self.movement_state, form_score, feedback
