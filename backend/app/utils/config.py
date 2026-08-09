"""
Configuration loaded from environment variables.
"""
import os


class Config:
    FLASK_PORT: int = int(os.environ.get("FLASK_PORT", 5000))
    FLASK_DEBUG: bool = os.environ.get("FLASK_DEBUG", "1") == "1"
    CORS_ORIGINS: list[str] = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")


config = Config()
