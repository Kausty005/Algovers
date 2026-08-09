"""
Shared fixture helpers for building synthetic MediaPipe landmark lists.

MediaPipe returns 33 landmarks indexed 0-32.
We fill all slots with a default value and only override the ones we care about.

Landmark indices used here match LandmarkIndex in pose_service.py.
"""
from typing import List, Dict


def make_landmarks(overrides: Dict[int, Dict[str, float]] = None) -> List[Dict[str, float]]:
    """
    Create a 33-landmark list.  Every landmark defaults to the centre of the
    frame (x=0.5, y=0.5, z=0.0, visibility=1.0).

    *overrides* is a dict of {landmark_index: {x, y, z, visibility}}.
    """
    default = {"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0}
    landmarks = [dict(default) for _ in range(33)]
    if overrides:
        for idx, values in overrides.items():
            landmarks[idx].update(values)
    return landmarks


# -----------------------------------------------------------------------
# Convenience: landmark indices
# -----------------------------------------------------------------------
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_ELBOW = 13
RIGHT_ELBOW = 14
LEFT_WRIST = 15
RIGHT_WRIST = 16
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28
