"""
Tests for the SquatAnalyzer.

Strategy: synthesise landmarks that produce a known knee angle by placing
hip, knee, and ankle at computed pixel positions, then drive the analyzer
through a full rep cycle and verify the rep count.
"""
import pytest
import math
from app.services.analyzers.squat import SquatAnalyzer, STAND_THRESHOLD, BOTTOM_THRESHOLD
from tests.landmark_helpers import make_landmarks, LEFT_HIP, LEFT_KNEE, LEFT_ANKLE


def landmarks_for_knee_angle(angle_deg: float):
    """
    Construct landmarks that produce the given knee angle.

    Layout:
      - knee     = (0.5, 0.5)   ← vertex
      - hip      = (0.5, 0.3)   (directly above)
      - ankle placed by rotating the knee→hip unit vector by angle_deg

    The vector knee→hip is (0, -0.2), unit = (0, -1).
    Rotating by angle_deg gives the knee→ankle direction.
    """
    knee = [0.5, 0.5]
    hip  = [0.5, 0.3]

    # unit vector knee → hip
    kh = [hip[0] - knee[0], hip[1] - knee[1]]
    kh_len = math.hypot(*kh)
    kh_unit = [kh[0] / kh_len, kh[1] / kh_len]

    # Rotate by angle_deg to get knee→ankle direction
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    ka_x = kh_unit[0] * cos_a - kh_unit[1] * sin_a
    ka_y = kh_unit[0] * sin_a + kh_unit[1] * cos_a
    ankle = [knee[0] + ka_x * 0.2, knee[1] + ka_y * 0.2]

    return make_landmarks({
        LEFT_HIP:   {"x": hip[0],   "y": hip[1],   "visibility": 1.0},
        LEFT_KNEE:  {"x": knee[0],  "y": knee[1],  "visibility": 1.0},
        LEFT_ANKLE: {"x": ankle[0], "y": ankle[1], "visibility": 1.0},
    })


def drive_squat_rep(analyzer: SquatAnalyzer) -> int:
    """
    Drive the analyzer through one complete squat rep.
    Returns total rep_count after the cycle.

    Uses angles well away from threshold boundaries (BOTTOM=100, STAND=160):
      descend:  165 → 115 → 85  (85 < 100 → BOTTOM)
      ascend:   85  → 115 → 165 (165 >= 160 → STANDING + rep)
    """
    # Descend
    for angle in [165, 115, 85]:
        analyzer.analyze(landmarks_for_knee_angle(angle))
    # Hold at bottom briefly
    analyzer.analyze(landmarks_for_knee_angle(85))
    # Ascend back to standing
    for angle in [115, 165]:
        analyzer.analyze(landmarks_for_knee_angle(angle))
    return analyzer.rep_count


class TestSquatAnalyzer:
    def test_initial_state(self):
        a = SquatAnalyzer()
        assert a.rep_count == 0
        assert a.movement_state == SquatAnalyzer.STANDING

    def test_one_rep(self):
        a = SquatAnalyzer()
        count = drive_squat_rep(a)
        assert count == 1

    def test_three_reps(self):
        a = SquatAnalyzer()
        for _ in range(3):
            drive_squat_rep(a)
        assert a.rep_count == 3

    def test_no_double_count(self):
        """Staying in BOTTOM state for many frames must not multiply reps."""
        a = SquatAnalyzer()
        # Descend
        for angle in [165, 115, 85]:
            a.analyze(landmarks_for_knee_angle(angle))
        # Sit at bottom for 10 frames
        for _ in range(10):
            a.analyze(landmarks_for_knee_angle(80))
        # Come back up
        for angle in [115, 165]:
            a.analyze(landmarks_for_knee_angle(angle))
        assert a.rep_count == 1

    def test_state_transitions(self):
        a = SquatAnalyzer()
        assert a.movement_state == SquatAnalyzer.STANDING
        # Descend past bottom threshold
        a.analyze(landmarks_for_knee_angle(85))
        assert a.movement_state in (SquatAnalyzer.BOTTOM, SquatAnalyzer.DESCENDING)

    def test_incomplete_rep_not_counted(self):
        """Going down but not coming back up → no rep."""
        a = SquatAnalyzer()
        for angle in [165, 115, 85]:
            a.analyze(landmarks_for_knee_angle(angle))
        assert a.rep_count == 0

    def test_reset(self):
        a = SquatAnalyzer()
        drive_squat_rep(a)
        a.reset()
        assert a.rep_count == 0
        assert a.movement_state == SquatAnalyzer.STANDING
