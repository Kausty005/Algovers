"""
Pose service — wraps MediaPipe Pose.

The frontend sends pre-extracted landmarks (x, y, z, visibility) from
MediaPipe running in the browser (via @mediapipe/pose or similar), or the
backend can process raw frames if sent as image bytes.

This service provides:
  1. A common landmark accessor using MediaPipe landmark indices.
  2. Optional server-side pose estimation if raw frames are provided.

Landmark index reference (MediaPipe Pose 33 landmarks):
  https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
"""
from __future__ import annotations
from typing import List, Dict, Optional


# MediaPipe Pose landmark indices
class LandmarkIndex:
    NOSE = 0
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


# Type alias for a list of landmark dicts
Landmarks = List[Dict[str, float]]


def get_landmark(landmarks: Landmarks, idx: int) -> Optional[List[float]]:
    """
    Return [x, y, z] for the landmark at *idx*, or None if not visible enough.
    Visibility threshold is 0.5.
    """
    if idx >= len(landmarks):
        return None
    lm = landmarks[idx]
    if lm.get("visibility", 1.0) < 0.5:
        return None
    return [lm["x"], lm["y"], lm.get("z", 0.0)]


def get_landmark_xy(landmarks: Landmarks, idx: int) -> Optional[List[float]]:
    """Return [x, y] only."""
    pt = get_landmark(landmarks, idx)
    if pt is None:
        return None
    return pt[:2]
