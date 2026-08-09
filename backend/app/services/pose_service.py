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
import base64
import cv2
import numpy as np

# Global MediaPipe Pose instance (lazy-loaded to save import time if unused)
_pose_instance = None

def _get_pose():
    global _pose_instance
    if _pose_instance is None:
        import mediapipe as mp
        from mediapipe.tasks import python
        from mediapipe.tasks.python import vision
        
        base_options = python.BaseOptions(model_asset_path='pose_landmarker_lite.task')
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE)
        _pose_instance = vision.PoseLandmarker.create_from_options(options)
    return _pose_instance


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


def extract_landmarks_from_b64(b64_str: str) -> Landmarks:
    """
    Decodes a base64 image (data:image/jpeg;base64,...) and runs MediaPipe Pose
    to extract 33 landmarks, formatted identically to frontend output.
    """
    if not b64_str:
        return []

    # Strip data URL prefix if present
    if "," in b64_str:
        b64_str = b64_str.split(",")[1]

    try:
        img_data = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []
            
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pose = _get_pose()
        import mediapipe as mp
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        results = pose.detect(mp_image)
        
        if not results.pose_landmarks:
            return []
            
        landmarks = []
        # results.pose_landmarks is a list of lists (one per detected person)
        for lm in results.pose_landmarks[0]:
            landmarks.append({
                "x": lm.x,
                "y": lm.y,
                "z": lm.z,
                "visibility": getattr(lm, "visibility", getattr(lm, "presence", 1.0))
            })
        return landmarks
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to extract landmarks: %s", e)
        return []

