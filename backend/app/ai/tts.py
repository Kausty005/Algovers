"""
Gym Buddy — Text-to-Speech Service
Converts AI-generated text into MP3 audio bytes using gTTS.

gTTS (Google Text-to-Speech) is free and requires no API key.
The service is isolated behind this interface — swapping providers
only requires changing this file.
"""

from __future__ import annotations

import io
import logging

logger = logging.getLogger(__name__)


class TTSService:
    """Converts text to MP3 audio bytes."""

    def synthesize(self, text: str, lang: str = "en") -> bytes:
        """Return MP3 audio bytes for *text*.

        Raises ``RuntimeError`` if synthesis fails.
        """
        if not text or not text.strip():
            raise ValueError("Text must not be empty")

        # Keep text short — trim to 200 chars max to avoid TTS latency
        text = text.strip()[:200]

        try:
            from gtts import gTTS  # type: ignore

            tts = gTTS(text=text, lang=lang, slow=False)
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            buffer.seek(0)
            audio_bytes = buffer.read()
            logger.debug("TTS synthesised %d chars → %d bytes", len(text), len(audio_bytes))
            return audio_bytes
        except ImportError:
            raise RuntimeError(
                "gTTS is not installed. Run: pip install gTTS"
            )
        except Exception as exc:
            logger.error("TTS synthesis failed: %s", exc)
            raise RuntimeError(f"TTS synthesis error: {exc}") from exc


# Singleton
tts_service = TTSService()
