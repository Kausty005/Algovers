"""
Push-up analyzer.

State machine:
    UP  ──→  LOWERING  ──→  BOTTOM  ──→  RISING  ──→  UP  (+1 rep)

Key joints:
  - Elbow angle: shoulder–elbow–wrist
  - Body alignment: shoulder–hip–ankle (should stay ~180°)

Thresholds (degrees):
    BOTTOM when elbow_angle < BOTTOM_THRESHOLD   (≈ 90°)
    UP     when elbow_angle > UP_THRESHOLD        (≈ 155°)
"""
from __future__ import annotations
from typing import Tuple

from app.services.analyzers.base import ExerciseAnalyzer
from app.services.pose_service import Landmarks, LandmarkIndex, get_landmark
from app.utils.angles import calculate_angle


UP_THRESHOLD = 155
BOTTOM_THRESHOLD = 100
ALIGNMENT_TOLERANCE = 25   # degrees from 180° before flagging sag/pike


class PushUpAnalyzer(ExerciseAnalyzer):
    """Analyzes push-up repetitions."""

    UP = "up"
    LOWERING = "lowering"
    BOTTOM = "bottom"
    RISING = "rising"

    def __init__(self) -> None:
        super().__init__()
        self.movement_state = self.UP

    def reset(self) -> None:
        super().reset()
        self.movement_state = self.UP

    def _get_elbow_angle(self, landmarks: Landmarks) -> Tuple[float, bool]:
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

    def _get_body_alignment(self, landmarks: Landmarks) -> Tuple[float, bool]:
        """Shoulder–hip–ankle angle. Ideally ≈ 180° (straight plank)."""
        for shoulder_idx, hip_idx, ankle_idx in [
            (LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_ANKLE),
            (LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_ANKLE),
        ]:
            s = get_landmark(landmarks, shoulder_idx)
            h = get_landmark(landmarks, hip_idx)
            a = get_landmark(landmarks, ankle_idx)
            if s and h and a:
                return calculate_angle(s, h, a), True
        return 180.0, False

    def _form_check(self, elbow_angle: float, body_align: float) -> Tuple[float, str]:
        score = 100.0
        feedback = "Good form."
        deviation = abs(180.0 - body_align)
        if deviation > ALIGNMENT_TOLERANCE:
            score -= 25
            if body_align < 180 - ALIGNMENT_TOLERANCE:
                feedback = "Keep your hips up — don't sag."
            else:
                feedback = "Lower your hips — avoid piking."
        if self.movement_state == self.BOTTOM and elbow_angle > BOTTOM_THRESHOLD + 20:
            score -= 15
            feedback = "Lower your chest further."
        return max(score, 0.0), feedback

    def analyze(self, landmarks: Landmarks) -> Tuple[bool, str, float, str]:
        elbow_angle, ok = self._get_elbow_angle(landmarks)
        body_align, _ = self._get_body_alignment(landmarks)

        if not ok:
            return False, self.movement_state, self._last_form_score, "Body not fully visible."

        rep_completed = False

        if self.movement_state == self.UP:
            if elbow_angle <= UP_THRESHOLD - 10:
                self.movement_state = self.LOWERING

        elif self.movement_state == self.LOWERING:
            if elbow_angle <= BOTTOM_THRESHOLD:
                self.movement_state = self.BOTTOM

        elif self.movement_state == self.BOTTOM:
            if elbow_angle >= BOTTOM_THRESHOLD + 10:
                self.movement_state = self.RISING

        elif self.movement_state == self.RISING:
            if elbow_angle >= UP_THRESHOLD:
                self.movement_state = self.UP
                self.rep_count += 1
                rep_completed = True
                form_score, _ = self._form_check(elbow_angle, body_align)
                if form_score >= 75:
                    self.correct_reps += 1
                else:
                    self.incorrect_reps += 1

        form_score, feedback = self._form_check(elbow_angle, body_align)
        self._last_form_score = form_score
        return rep_completed, self.movement_state, form_score, feedback
