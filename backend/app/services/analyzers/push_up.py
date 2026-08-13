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

from app.services.analyzers.base import ExerciseAnalyzer, MIN_REP_FORM_SCORE
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
        self._deepest_angle: float = 180.0
        self._last_primary_angle: float = 180.0
        self._frames_static: int = 0

    def reset(self) -> None:
        super().reset()
        self.movement_state = self.UP
        self._deepest_angle = 180.0
        self._last_primary_angle = 180.0
        self._frames_static = 0

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

    def _form_check(self, elbow_angle: float, body_align: float, current_state: str, deepest_angle: float, frames_static: int) -> Tuple[float, str]:
        score = 100.0
        feedback = "Good form."

        # Static plank penalty (holding plank or pausing mid-rep)
        if frames_static > 30:
            static_penalty = min(80, (frames_static - 30) * 1.5)
            score -= static_penalty
            feedback = "Keep moving! Don't hold a static pose."

        deviation = abs(180.0 - body_align)
        
        if deviation > ALIGNMENT_TOLERANCE:
            penalty = min(70, (deviation - ALIGNMENT_TOLERANCE) * 3)
            score -= penalty
            if feedback in ("Good form.", "Keep moving! Don't hold a static pose."):
                if body_align < 180 - ALIGNMENT_TOLERANCE:
                    feedback = "Keep your hips up — don't sag."
                else:
                    feedback = "Lower your hips — avoid piking."
                
        # Heavy penalty for not going deep enough
        if current_state in (self.BOTTOM, self.RISING):
            if deepest_angle > BOTTOM_THRESHOLD + 10:
                depth_penalty = min(70, (deepest_angle - BOTTOM_THRESHOLD) * 1.5)
                score -= depth_penalty
                if feedback in ("Good form.", "Keep moving! Don't hold a static pose."):
                    feedback = "Lower your chest much further."
                    
        return max(score, 0.0), feedback

    def analyze(self, landmarks: Landmarks) -> Tuple[bool, str, float, str]:
        elbow_angle, ok = self._get_elbow_angle(landmarks)
        body_align, _ = self._get_body_alignment(landmarks)

        if not ok:
            return False, self.movement_state, self._last_form_score, "Body not fully visible."

        # Track static posture
        if abs(elbow_angle - self._last_primary_angle) < 3.0:
            self._frames_static += 1
        else:
            self._frames_static = 0
        self._last_primary_angle = elbow_angle

        rep_completed = False

        if self.movement_state == self.UP:
            if elbow_angle <= UP_THRESHOLD - 10:
                self.movement_state = self.LOWERING
                self._deepest_angle = elbow_angle

        elif self.movement_state == self.LOWERING:
            self._deepest_angle = min(self._deepest_angle, elbow_angle)
            if elbow_angle <= BOTTOM_THRESHOLD:
                self.movement_state = self.BOTTOM
            elif elbow_angle >= self._deepest_angle + 20:
                self.movement_state = self.RISING

        elif self.movement_state == self.BOTTOM:
            self._deepest_angle = min(self._deepest_angle, elbow_angle)
            if elbow_angle >= BOTTOM_THRESHOLD + 10:
                self.movement_state = self.RISING

        elif self.movement_state == self.RISING:
            if elbow_angle >= UP_THRESHOLD:
                self.movement_state = self.UP
                if self._last_form_score >= MIN_REP_FORM_SCORE:
                    self.rep_count += 1
                    rep_completed = True
                    
                    if self._deepest_angle <= BOTTOM_THRESHOLD + 10:
                        self.correct_reps += 1
                    else:
                        self.incorrect_reps += 1
                        
                self._deepest_angle = 180.0

        raw_score, feedback = self._form_check(
            elbow_angle, 
            body_align, 
            self.movement_state, 
            self._deepest_angle,
            self._frames_static
        )
        
        # Smooth the score so it doesn't jump wildly (EWMA)
        smoothed_score = (self._last_form_score * 0.5) + (raw_score * 0.5)
        self._last_form_score = smoothed_score
        
        return rep_completed, self.movement_state, round(smoothed_score, 1), feedback
