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

from app.services.analyzers.base import ExerciseAnalyzer, MIN_REP_FORM_SCORE
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
        self._min_angle = 180.0
        self._max_angle = 0.0
        self._last_primary_angle = 180.0
        self._frames_static = 0

    def reset(self) -> None:
        super().reset()
        self.movement_state = self.DOWN
        self._min_angle = 180.0
        self._max_angle = 0.0
        self._last_primary_angle = 180.0
        self._frames_static = 0

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

    def _get_upper_arm_angle(self, landmarks: Landmarks) -> Tuple[float, bool]:
        """Angle between hip, shoulder, and elbow (upper arm vs torso)."""
        for hip_idx, shoulder_idx, elbow_idx in [
            (LandmarkIndex.LEFT_HIP, LandmarkIndex.LEFT_SHOULDER, LandmarkIndex.LEFT_ELBOW),
            (LandmarkIndex.RIGHT_HIP, LandmarkIndex.RIGHT_SHOULDER, LandmarkIndex.RIGHT_ELBOW),
        ]:
            h = get_landmark(landmarks, hip_idx)
            s = get_landmark(landmarks, shoulder_idx)
            e = get_landmark(landmarks, elbow_idx)
            if h and s and e:
                return calculate_angle(h, s, e), True
        return 0.0, False

    def _form_check(self, upper_arm_angle: float, frames_static: int) -> Tuple[float, str]:
        score = 100.0
        feedback = "Good form."
        
        # Static pose penalty (holding a pose or paused mid-rep)
        if frames_static > 30:
            static_penalty = min(80, (frames_static - 30) * 1.5)
            score -= static_penalty
            feedback = "Keep moving! Don't hold a static pose."

        # Upper arm stability check (elbow swinging forward/back)
        if upper_arm_angle > 25:
            penalty = min(70, (upper_arm_angle - 25) * 2.5)
            score -= penalty
            if feedback in ("Good form.", "Keep moving! Don't hold a static pose."):
                feedback = "Keep your elbow locked at your side."
        
        # When lowering or resting at bottom, penalize if the preceding curl was shallow
        if self.movement_state in (self.LOWERING, self.DOWN):
            if self._min_angle > TOP_THRESHOLD + 10:
                penalty = min(70, (self._min_angle - TOP_THRESHOLD) * 1.5)
                score -= penalty
                if feedback in ("Good form.", "Keep moving! Don't hold a static pose."):
                    feedback = "Curl much higher."
                
        # When curling or resting at top, penalize if the preceding extension was shallow
        if self.movement_state in (self.CURLING, self.TOP):
            # Only penalize if we actually have a max_angle recorded (i.e. not the very first rep)
            if self._max_angle > 0 and self._max_angle < DOWN_THRESHOLD - 10:
                penalty = min(70, (DOWN_THRESHOLD - self._max_angle) * 1.5)
                score -= penalty
                if feedback in ("Good form.", "Keep moving! Don't hold a static pose."):
                    feedback = "Lower arm fully."

        return max(0.0, score), feedback

    def analyze(self, landmarks: Landmarks) -> Tuple[bool, str, float, str]:
        elbow_angle, ok = self._get_elbow_angle(landmarks)
        upper_arm_angle, _ = self._get_upper_arm_angle(landmarks)

        if not ok:
            return False, self.movement_state, self._last_form_score, "Arm not visible."

        # Track static posture
        if abs(elbow_angle - self._last_primary_angle) < 3.0:
            self._frames_static += 1
        else:
            self._frames_static = 0
        self._last_primary_angle = elbow_angle

        rep_completed = False

        if self.movement_state == self.DOWN:
            if elbow_angle <= DOWN_THRESHOLD - 10:
                self.movement_state = self.CURLING
                self._min_angle = elbow_angle  # start tracking curl depth

        elif self.movement_state == self.CURLING:
            self._min_angle = min(self._min_angle, elbow_angle)
            if elbow_angle <= TOP_THRESHOLD:
                self.movement_state = self.TOP
            elif elbow_angle >= self._min_angle + 20:
                # Started lowering without hitting top
                self.movement_state = self.LOWERING
                self._max_angle = elbow_angle # start tracking extension

        elif self.movement_state == self.TOP:
            if elbow_angle >= TOP_THRESHOLD + 10:
                self.movement_state = self.LOWERING
                self._max_angle = elbow_angle

        elif self.movement_state == self.LOWERING:
            self._max_angle = max(self._max_angle, elbow_angle)
            if elbow_angle >= DOWN_THRESHOLD:
                self.movement_state = self.DOWN
                if self._last_form_score >= MIN_REP_FORM_SCORE:
                    self.rep_count += 1
                    rep_completed = True
                    
                    # Check rep quality
                    if self._min_angle <= TOP_THRESHOLD + 10:
                        self.correct_reps += 1
                    else:
                        self.incorrect_reps += 1
                    
            elif elbow_angle <= self._max_angle - 20:
                # Started curling without hitting bottom
                self.movement_state = self.CURLING
                self._min_angle = elbow_angle

        raw_score, feedback = self._form_check(upper_arm_angle, self._frames_static)
        
        # Smooth the score so it doesn't jump wildly (EWMA)
        smoothed_score = (self._last_form_score * 0.5) + (raw_score * 0.5)
        self._last_form_score = smoothed_score
        
        return rep_completed, self.movement_state, round(smoothed_score, 1), feedback
