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

from app.services.analyzers.base import ExerciseAnalyzer, MIN_REP_FORM_SCORE
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
        self._last_primary_angle: float = 180.0
        self._frames_static: int = 0

    def reset(self) -> None:
        super().reset()
        self.movement_state = self.STANDING
        self._deepest_angle = 180.0
        self._last_primary_angle = 180.0
        self._frames_static = 0

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

    def _form_check(self, knee_angle: float, landmarks: Landmarks, current_state: str, deepest_angle: float, frames_static: int) -> Tuple[float, str]:
        """Basic form checks. Returns (score 0-100, feedback string)."""
        score = 100.0
        feedback = "Good form."

        # Static pose penalty (standing still or paused mid-rep)
        # 30 frames is roughly 3 seconds
        if frames_static > 30:
            static_penalty = min(80, (frames_static - 30) * 1.5)
            score -= static_penalty
            feedback = "Keep moving! Don't stand still."

        # Check back angle (posture)
        shoulder = get_landmark(landmarks, LandmarkIndex.LEFT_SHOULDER)
        hip = get_landmark(landmarks, LandmarkIndex.LEFT_HIP)
        if shoulder and hip:
            # Angle between shoulder-hip line and vertical
            vertical_pt = [hip[0], hip[1] - 1.0, hip[2] if len(hip) > 2 else 0.0]
            back_angle = calculate_angle(shoulder, hip, vertical_pt)
            if back_angle > 45:
                # Heavy penalty for leaning forward (up to 70 pts)
                penalty = min(70, (back_angle - 45) * 3)
                score -= penalty
                if feedback in ("Good form.", "Keep moving! Don't stand still."):
                    feedback = "Keep your back straight."

        # Depth penalty applies when they are at the bottom or coming up
        if current_state in (self.BOTTOM, self.ASCENDING):
            if deepest_angle > DEPTH_THRESHOLD:
                # Heavy penalty for shallow squat (up to 80 pts)
                depth_penalty = min(80, (deepest_angle - DEPTH_THRESHOLD) * 2)
                score -= depth_penalty
                if feedback in ("Good form.", "Keep moving! Don't stand still."):
                    feedback = "Go much deeper."
        
        return max(0.0, score), feedback

    def analyze(self, landmarks: Landmarks) -> Tuple[bool, str, float, str]:
        """Process one frame. Returns (rep_completed, state, form_score, feedback)."""
        knee_angle, ok = self._get_knee_angle(landmarks)
        if not ok:
            return False, self.movement_state, self._last_form_score, "Body not fully visible."

        # Track static posture
        if abs(knee_angle - self._last_primary_angle) < 3.0:
            self._frames_static += 1
        else:
            self._frames_static = 0
        self._last_primary_angle = knee_angle

        rep_completed = False

        # --- State machine ---
        if self.movement_state == self.STANDING:
            if knee_angle <= BOTTOM_THRESHOLD + 20:   # start descending
                self.movement_state = self.DESCENDING
                self._deepest_angle = knee_angle

        elif self.movement_state == self.DESCENDING:
            self._deepest_angle = min(self._deepest_angle, knee_angle)
            if knee_angle <= BOTTOM_THRESHOLD:
                self.movement_state = self.BOTTOM
            elif knee_angle >= self._deepest_angle + 20:
                # They started going up without hitting the bottom threshold
                self.movement_state = self.ASCENDING

        elif self.movement_state == self.BOTTOM:
            self._deepest_angle = min(self._deepest_angle, knee_angle)
            if knee_angle >= BOTTOM_THRESHOLD + 10:   # hysteresis gap
                self.movement_state = self.ASCENDING

        elif self.movement_state == self.ASCENDING:
            if knee_angle >= STAND_THRESHOLD:
                self.movement_state = self.STANDING
                if self._last_form_score >= MIN_REP_FORM_SCORE:
                    self.rep_count += 1
                    rep_completed = True
                    # Score the completed rep
                    if self._deepest_angle <= DEPTH_THRESHOLD:
                        self.correct_reps += 1
                    else:
                        self.incorrect_reps += 1
                self._deepest_angle = 180.0  # reset for next rep

        # Form score & feedback
        raw_score, feedback = self._form_check(knee_angle, landmarks, self.movement_state, self._deepest_angle, self._frames_static)
        
        # Smooth the score so it doesn't jump wildly (EWMA)
        smoothed_score = (self._last_form_score * 0.5) + (raw_score * 0.5)
        self._last_form_score = smoothed_score
        
        return rep_completed, self.movement_state, round(smoothed_score, 1), feedback
