"""
Gym Buddy — AI Model Provider
Abstraction layer over the LLM backend.

Uses Google Gemini (free tier) when GEMINI_API_KEY is set.
Falls back to curated template-based responses otherwise so the app
works in zero-cost / offline hackathon demos.
"""

from __future__ import annotations

import os
import random
import logging
from dotenv import load_dotenv

# Force reload of environment variables so that any changes to .env 
# (like API keys) take effect immediately without a server restart.
load_dotenv(override=True)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Template fallback responses
# ---------------------------------------------------------------------------

_GUIDANCE_TEMPLATES: dict[str, list[str]] = {
    "squat": [
        "Keep your chest up and knees aligned with your toes.",
        "Drive through your heels as you stand up.",
        "Go a little deeper — aim for thighs parallel to the floor.",
        "Keep your core braced throughout the movement.",
        "Control the descent — don't drop too fast.",
    ],
    "bicep_curl": [
        "Keep your elbows pinned to your sides.",
        "Squeeze at the top for a full contraction.",
        "Lower the weight with control — don't let it drop.",
        "Avoid swinging your body; isolate the biceps.",
        "Full range of motion — all the way down, all the way up.",
    ],
    "push_up": [
        "Keep your body in a straight line from head to heels.",
        "Lower your chest all the way to the floor for full range.",
        "Engage your core — don't let your hips sag.",
        "Keep your elbows at roughly 45 degrees from your body.",
        "Breathe in on the way down, out on the way up.",
    ],
    "default": [
        "Great form! Keep it up.",
        "Stay controlled and breathe steadily.",
        "Focus on the muscle you're working.",
        "Quality over quantity — maintain good technique.",
    ],
}

_MOTIVATION_TEMPLATES: list[str] = [
    "You're doing amazing — keep pushing!",
    "Every rep counts. Don't stop now!",
    "You're stronger than you think. Go!",
    "Halfway there — finish strong!",
    "Last few reps — make them count!",
    "Excellent effort! Keep that intensity!",
    "You've got this! Stay focused!",
]

_CHAT_TEMPLATES: dict[str, str] = {
    "squat": "Focus on keeping your knees aligned and controlling the descent. Drive through your heels and keep your chest up throughout.",
    "curl": "Keep your elbows pinned to your sides and squeeze at the top. Use a controlled tempo — don't swing the weight.",
    "push": "Maintain a straight body line from head to heels. Lower all the way down and keep your core tight.",
    "default": "Great question! Focus on proper form, full range of motion, and controlled breathing. Quality reps beat fast sloppy ones every time.",
}


def _template_guidance(exercise: str, form_feedback: str, form_score: int) -> str:
    pool = _GUIDANCE_TEMPLATES.get(exercise, _GUIDANCE_TEMPLATES["default"])
    # If score is bad, pick something form-related, else random
    if form_score < 70 and form_feedback:
        return form_feedback  # echo back the CV feedback as a base
    return random.choice(pool)


def _template_motivation(rep_count: int, target_reps: int) -> str:
    remaining = max(0, target_reps - rep_count)
    if remaining == 0:
        return "Session complete — outstanding effort!"
    if remaining <= 2:
        return f"Just {remaining} more rep{'s' if remaining > 1 else ''}! Finish strong!"
    return random.choice(_MOTIVATION_TEMPLATES)


def _template_chat(message: str) -> str:
    msg_lower = message.lower()
    for key in _CHAT_TEMPLATES:
        if key in msg_lower:
            return _CHAT_TEMPLATES[key]
    return _CHAT_TEMPLATES["default"]


# ---------------------------------------------------------------------------
# Gemini client
# ---------------------------------------------------------------------------

_gemini_models = {}  # lazy-initialised dict of models


def _get_gemini_model(model_name: str):
    global _gemini_models
    if model_name in _gemini_models:
        return _gemini_models[model_name]

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.error("CRITICAL: GEMINI_API_KEY is not set in the environment! Falling back to templates.")
        return None

    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=api_key)
        _gemini_models[model_name] = genai.GenerativeModel(model_name)
        logger.info("Gemini model initialised: %s", model_name)
        return _gemini_models[model_name]
    except Exception as exc:
        logger.error("CRITICAL: Failed to initialise Gemini (is the model name correct?): %s", exc)
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


class AIModelProvider:
    """Unified interface to generate AI text.

    All AI modules (guidance, motivation, chatbot) call this class.
    To swap the underlying LLM, change only this file.
    """

    def generate(
        self,
        prompt: str,
        max_tokens: int = 200,
        temperature: float = 0.7,
        fallback: str | None = None,
        model_name: str | None = None,
    ) -> str:
        """Generate text from *prompt*.

        Returns *fallback* if both Gemini and the fallback logic fail.
        """
        # Default fallback model if not specified
        if not model_name:
            model_name = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

        model = _get_gemini_model(model_name)
        if model:
            try:
                response = model.generate_content(
                    prompt,
                    generation_config={
                        "temperature": temperature,
                    },
                )
                text = response.text.strip()
                if text:
                    return text
            except Exception as exc:
                logger.warning("Gemini generation failed, using fallback: %s", exc)

        return fallback or "Keep going, you're doing great!"


# Singleton used by all AI modules
ai_provider = AIModelProvider()
