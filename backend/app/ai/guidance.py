"""
Gym Buddy — Guidance AI
Converts raw CV workout facts into short, actionable coaching cues.

Priority rules:
  high   — form_score < 60 OR explicit bad-form keywords detected
  medium — form_score 60-79
  low    — form_score >= 80
"""

from __future__ import annotations

import logging
import random
from .model_provider import ai_provider, _template_guidance

logger = logging.getLogger(__name__)

# Keywords in form_feedback that warrant a HIGH priority cue
_HIGH_PRIORITY_KEYWORDS = [
    "inward", "rounding", "arch", "collapse", "pain", "injury",
    "locked", "hyperextend", "too fast", "dangerous",
]

_SYSTEM_CONTEXT = (
    "You are a real-time AI fitness coach. "
    "Respond with ONE short sentence (under 12 words) of actionable coaching. "
    "No greetings. No explanations. Just the coaching cue."
)


def _determine_priority(form_score: int, form_feedback: str) -> str:
    feedback_lower = (form_feedback or "").lower()
    if form_score < 60 or any(kw in feedback_lower for kw in _HIGH_PRIORITY_KEYWORDS):
        return "high"
    if form_score < 80:
        return "medium"
    return "low"


class GuidanceAI:
    """Generates real-time exercise coaching cues."""

    def get_guidance(
        self,
        exercise: str,
        rep_count: int,
        form_score: int,
        form_feedback: str,
        movement_state: str,
    ) -> dict:
        """Return ``{"text": str, "priority": str}``."""
        priority = _determine_priority(form_score, form_feedback)

        # Build the prompt (Gemini path)
        prompt = (
            f"{_SYSTEM_CONTEXT}\n\n"
            f"Exercise: {exercise}\n"
            f"Current rep: {rep_count}\n"
            f"Form score: {form_score}/100\n"
            f"Movement state: {movement_state}\n"
            f"CV feedback: {form_feedback or 'none'}\n"
            f"Priority level: {priority}\n\n"
            "Coaching cue:"
        )

        fallback_text = _template_guidance(exercise, form_feedback or "", form_score)
        text = ai_provider.generate(prompt, max_tokens=30, temperature=0.6, fallback=fallback_text)

        # Ensure the response is concise (trim to first sentence if model is verbose)
        text = text.split(".")[0].strip()
        if not text.endswith("."):
            text += "."

        return {"text": text, "priority": priority}


# Singleton
guidance_ai = GuidanceAI()
