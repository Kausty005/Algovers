"""
Gym Buddy — Chatbot AI
Fitness-focused conversational assistant.

Ground rules (enforced via system prompt):
  - Only discusses fitness, exercise, and workout topics.
  - Does NOT make medical diagnoses or prescriptions.
  - Stays friendly, concise, and practical.
"""

from __future__ import annotations

import logging
from .model_provider import ai_provider, _template_chat

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are Gym Buddy, a friendly and knowledgeable AI fitness coach. "
    "You help users improve their workouts, understand proper form, and stay motivated. "
    "You ONLY discuss fitness, exercise, nutrition basics, and wellness. "
    "You do NOT provide medical diagnoses, prescriptions, or any medical advice. "
    "If asked about injuries or medical conditions, always recommend seeing a healthcare professional. "
    "Keep responses concise — 2 to 4 sentences max. Be friendly and encouraging."
)

# Quick-reject phrases for clearly out-of-scope medical questions
_MEDICAL_KEYWORDS = [
    "diagnose", "prescription", "medication", "drug", "surgery",
    "doctor", "hospital", "symptom", "disease", "disorder",
]


def _is_medical_question(message: str) -> bool:
    lower = message.lower()
    return any(kw in lower for kw in _MEDICAL_KEYWORDS)


class ChatbotAI:
    """Fitness-focused conversational AI."""

    def chat(self, message: str, model_name: str | None = None) -> dict:
        """Return ``{"response": str}``."""
        if _is_medical_question(message):
            return {
                "response": (
                    "That sounds like a medical question — I'm a fitness coach, not a doctor! "
                    "Please consult a qualified healthcare professional for medical concerns. "
                    "I'm here to help with your workouts and exercise form though!"
                )
            }

        prompt = f"{_SYSTEM_PROMPT}\n\nUser: {message}\nGym Buddy:"

        fallback = _template_chat(message)
        response = ai_provider.generate(
            prompt, 
            max_tokens=150, 
            temperature=0.7, 
            fallback=fallback, 
            model_name=model_name
        )

        # Strip any leading "Gym Buddy:" the model might echo
        response = response.strip()
        if response.lower().startswith("gym buddy:"):
            response = response[len("gym buddy:"):].strip()

        return {"response": response}


# Singleton
chatbot_ai = ChatbotAI()
