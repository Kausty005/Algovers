"""
Gym Buddy — Motivation AI
Generates short, speech-ready motivational phrases during workouts.
Responses are kept ≤ 12 words so TTS stays snappy.
"""

from __future__ import annotations

import logging
from .model_provider import ai_provider, _template_motivation

logger = logging.getLogger(__name__)

_SYSTEM_CONTEXT = (
    "You are an enthusiastic personal trainer giving a quick motivational shout-out "
    "during a workout set. Reply with ONE short sentence under 12 words. "
    "Sound energetic and encouraging. No emojis. No greetings."
)


class MotivationAI:
    """Generates motivational messages keyed to workout progress."""

    def get_motivation(
        self,
        exercise: str,
        rep_count: int,
        target_reps: int,
        form_score: int,
    ) -> dict:
        """Return ``{"text": str}``."""
        remaining = max(0, target_reps - rep_count)

        prompt = (
            f"{_SYSTEM_CONTEXT}\n\n"
            f"Exercise: {exercise}\n"
            f"Completed reps: {rep_count} of {target_reps}\n"
            f"Remaining: {remaining}\n"
            f"Form score: {form_score}/100\n\n"
            "Motivational message:"
        )

        fallback = _template_motivation(rep_count, target_reps)
        text = ai_provider.generate(prompt, max_tokens=25, temperature=0.8, fallback=fallback)

        # Keep it clean — trim to first sentence
        text = text.split(".")[0].strip()
        if text and not text.endswith("!"):
            text += "!"

        return {"text": text}


# Singleton
motivation_ai = MotivationAI()
