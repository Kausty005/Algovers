"""
Tests for the BicepCurlAnalyzer.
"""
import math
import pytest
from app.services.analyzers.bicep_curl import BicepCurlAnalyzer, DOWN_THRESHOLD, TOP_THRESHOLD
from tests.landmark_helpers import make_landmarks, LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST


def landmarks_for_elbow_angle(angle_deg: float):
    """
    Synthesise landmarks so that shoulder–elbow–wrist = angle_deg.

    Layout (all in normalised screen coords):
      - elbow  = (0.5, 0.5)   ← vertex
      - shoulder offset UP from elbow by 0.2 → (0.5, 0.3)
      - wrist placed so the angle at elbow equals angle_deg

    The vector elbow→shoulder is (0, -0.2), i.e. pointing up.
    We rotate that vector by angle_deg around elbow to get the
    elbow→wrist direction, then scale by 0.2.
    """
    elbow = [0.5, 0.5]
    shoulder = [0.5, 0.3]

    # unit vector: elbow → shoulder
    es = [shoulder[0] - elbow[0], shoulder[1] - elbow[1]]
    es_len = math.hypot(*es)
    es_unit = [es[0] / es_len, es[1] / es_len]

    # Rotate es_unit by angle_deg to get elbow→wrist direction
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    ew_x = es_unit[0] * cos_a - es_unit[1] * sin_a
    ew_y = es_unit[0] * sin_a + es_unit[1] * cos_a
    wrist = [elbow[0] + ew_x * 0.2, elbow[1] + ew_y * 0.2]

    return make_landmarks({
        LEFT_SHOULDER: {"x": shoulder[0], "y": shoulder[1], "visibility": 1.0},
        LEFT_ELBOW:    {"x": elbow[0],    "y": elbow[1],    "visibility": 1.0},
        LEFT_WRIST:    {"x": wrist[0],    "y": wrist[1],    "visibility": 1.0},
    })


def drive_curl_rep(analyzer: BicepCurlAnalyzer) -> int:
    """Drive through one complete bicep curl rep."""
    # Arm extended (DOWN state)
    for angle in [170, 160]:
        analyzer.analyze(landmarks_for_elbow_angle(angle))
    # Curling up
    for angle in [140, 100, 55]:
        analyzer.analyze(landmarks_for_elbow_angle(angle))
    # TOP state reached — start lowering
    for angle in [80, 120]:
        analyzer.analyze(landmarks_for_elbow_angle(angle))
    # Return to DOWN
    analyzer.analyze(landmarks_for_elbow_angle(160))
    return analyzer.rep_count


class TestBicepCurlAnalyzer:
    def test_initial_state(self):
        a = BicepCurlAnalyzer()
        assert a.rep_count == 0
        assert a.movement_state == BicepCurlAnalyzer.DOWN

    def test_one_rep(self):
        a = BicepCurlAnalyzer()
        count = drive_curl_rep(a)
        assert count == 1

    def test_two_reps(self):
        a = BicepCurlAnalyzer()
        for _ in range(2):
            drive_curl_rep(a)
        assert a.rep_count == 2

    def test_no_double_count_at_top(self):
        """Holding at top for multiple frames must not increment reps."""
        a = BicepCurlAnalyzer()
        # Go to DOWN
        for angle in [165, 160]:
            a.analyze(landmarks_for_elbow_angle(angle))
        # Curl up to TOP
        for angle in [120, 55]:
            a.analyze(landmarks_for_elbow_angle(angle))
        # Hold at top for 8 frames
        for _ in range(8):
            a.analyze(landmarks_for_elbow_angle(45))
        # Lower back down
        for angle in [80, 160]:
            a.analyze(landmarks_for_elbow_angle(angle))
        assert a.rep_count == 1

    def test_incomplete_curl_not_counted(self):
        """Partial curl that never reaches TOP_THRESHOLD → no rep."""
        a = BicepCurlAnalyzer()
        # Only curls to 80° (not below TOP_THRESHOLD=60°)
        for angle in [165, 130, 80, 130, 165]:
            a.analyze(landmarks_for_elbow_angle(angle))
        assert a.rep_count == 0

    def test_reset(self):
        a = BicepCurlAnalyzer()
        drive_curl_rep(a)
        a.reset()
        assert a.rep_count == 0
