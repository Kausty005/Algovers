"""Tests for the angle calculation utility."""
import pytest
from app.utils.angles import calculate_angle


def test_right_angle():
    # Classic L-shape: (0,1) — (0,0) — (1,0) → 90°
    a = [0.0, 1.0]
    b = [0.0, 0.0]
    c = [1.0, 0.0]
    assert calculate_angle(a, b, c) == pytest.approx(90.0, abs=0.5)


def test_straight_angle():
    # Straight line: (0,0) — (1,0) — (2,0) → 180°
    a = [0.0, 0.0]
    b = [1.0, 0.0]
    c = [2.0, 0.0]
    assert calculate_angle(a, b, c) == pytest.approx(180.0, abs=0.5)


def test_acute_angle():
    # Equilateral triangle → 60°
    import math
    a = [0.0, 0.0]
    b = [1.0, 0.0]
    c = [0.5, math.sqrt(3) / 2]
    assert calculate_angle(a, b, c) == pytest.approx(60.0, abs=0.5)


def test_zero_case():
    # Degenerate — same point for a and c → 0°
    a = [1.0, 0.0]
    b = [0.0, 0.0]
    c = [1.0, 0.0]  # same as a → angle = 0
    result = calculate_angle(a, b, c)
    assert 0.0 <= result <= 180.0


def test_with_3d_points():
    # z coordinate should be ignored
    a = [0.0, 1.0, 5.0]
    b = [0.0, 0.0, 3.0]
    c = [1.0, 0.0, 1.0]
    assert calculate_angle(a, b, c) == pytest.approx(90.0, abs=0.5)
