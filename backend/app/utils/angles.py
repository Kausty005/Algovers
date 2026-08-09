"""
Angle calculation utilities used across all exercise analyzers.
"""
import math
import numpy as np
from typing import Sequence


def calculate_angle(a: Sequence[float], b: Sequence[float], c: Sequence[float]) -> float:
    """
    Calculate the angle at vertex *b* formed by three 2-D (or 3-D) points.

    Args:
        a: First point  [x, y] or [x, y, z]
        b: Vertex point [x, y] or [x, y, z]
        c: Third point  [x, y] or [x, y, z]

    Returns:
        Angle in degrees in the range [0, 180].
    """
    a = np.array(a[:2], dtype=float)
    b = np.array(b[:2], dtype=float)
    c = np.array(c[:2], dtype=float)

    ba = a - b
    bc = c - b

    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    # Clamp to valid arccos range
    cosine = float(np.clip(cosine, -1.0, 1.0))
    angle = math.degrees(math.acos(cosine))
    return round(angle, 2)
