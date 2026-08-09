"""
Tests for the PushUpAnalyzer.
"""
import math
import pytest
from app.services.analyzers.push_up import PushUpAnalyzer, UP_THRESHOLD, BOTTOM_THRESHOLD
from tests.landmark_helpers import (
    make_landmarks,
    LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST,
    LEFT_HIP, LEFT_ANKLE,
)


def landmarks_for_pushup(elbow_angle_deg: float, body_align_deg: float = 180.0):
    """
    Build landmarks for the given elbow angle and body alignment angle.

    Elbow layout:
      - elbow    = (0.5, 0.5)  ← vertex
      - shoulder = (0.3, 0.5)  (to the left)
      - wrist placed by rotating elbow→shoulder vector by elbow_angle_deg

    Body alignment (shoulder–hip–ankle):
      - hip      = (0.5, 0.7)  ← vertex
      - shoulder = (0.5, 0.5)
      - ankle placed by rotating hip→shoulder vector by body_align_deg
      (180° = straight plank)
    """
    # ---- Elbow angle (shoulder-elbow-wrist) ----
    elbow    = [0.5, 0.5]
    shoulder = [0.3, 0.5]   # horizontal offset for clear angle

    es = [shoulder[0] - elbow[0], shoulder[1] - elbow[1]]
    es_len = math.hypot(*es)
    es_unit = [es[0] / es_len, es[1] / es_len]

    rad_e = math.radians(elbow_angle_deg)
    cos_e, sin_e = math.cos(rad_e), math.sin(rad_e)
    ew_x = es_unit[0] * cos_e - es_unit[1] * sin_e
    ew_y = es_unit[0] * sin_e + es_unit[1] * cos_e
    wrist = [elbow[0] + ew_x * 0.2, elbow[1] + ew_y * 0.2]

    # ---- Body alignment (shoulder-hip-ankle) ----
    hip = [0.5, 0.7]
    # unit vector hip → shoulder
    hs = [shoulder[0] - hip[0], shoulder[1] - hip[1]]
    hs_len = math.hypot(*hs)
    hs_unit = [hs[0] / hs_len, hs[1] / hs_len]

    rad_b = math.radians(body_align_deg)
    cos_b, sin_b = math.cos(rad_b), math.sin(rad_b)
    ha_x = hs_unit[0] * cos_b - hs_unit[1] * sin_b
    ha_y = hs_unit[0] * sin_b + hs_unit[1] * cos_b
    ankle = [hip[0] + ha_x * 0.25, hip[1] + ha_y * 0.25]

    return make_landmarks({
        LEFT_SHOULDER: {"x": shoulder[0], "y": shoulder[1], "visibility": 1.0},
        LEFT_ELBOW:    {"x": elbow[0],    "y": elbow[1],    "visibility": 1.0},
        LEFT_WRIST:    {"x": wrist[0],    "y": wrist[1],    "visibility": 1.0},
        LEFT_HIP:      {"x": hip[0],      "y": hip[1],      "visibility": 1.0},
        LEFT_ANKLE:    {"x": ankle[0],    "y": ankle[1],    "visibility": 1.0},
    })


def drive_pushup_rep(analyzer: PushUpAnalyzer) -> int:
    """Drive through one complete push-up rep."""
    # Start UP (arms extended)
    for angle in [170, 160]:
        analyzer.analyze(landmarks_for_pushup(angle))
    # Lower down
    for angle in [140, 110, 85]:
        analyzer.analyze(landmarks_for_pushup(angle))
    # Rise back up
    for angle in [110, 160]:
        analyzer.analyze(landmarks_for_pushup(angle))
    return analyzer.rep_count


class TestPushUpAnalyzer:
    def test_initial_state(self):
        a = PushUpAnalyzer()
        assert a.rep_count == 0
        assert a.movement_state == PushUpAnalyzer.UP

    def test_one_rep(self):
        a = PushUpAnalyzer()
        count = drive_pushup_rep(a)
        assert count == 1

    def test_two_reps(self):
        a = PushUpAnalyzer()
        for _ in range(2):
            drive_pushup_rep(a)
        assert a.rep_count == 2

    def test_no_double_count_at_bottom(self):
        """Holding at bottom for multiple frames must not increment reps."""
        a = PushUpAnalyzer()
        # Start UP and lower
        for angle in [165, 130, 85]:
            a.analyze(landmarks_for_pushup(angle))
        # Hold at bottom
        for _ in range(5):
            a.analyze(landmarks_for_pushup(80))
        # Rise back up
        for angle in [110, 160]:
            a.analyze(landmarks_for_pushup(angle))
        assert a.rep_count == 1

    def test_reset(self):
        a = PushUpAnalyzer()
        drive_pushup_rep(a)
        a.reset()
        assert a.rep_count == 0
        assert a.movement_state == PushUpAnalyzer.UP
