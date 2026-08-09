"""
Gym Buddy — Flask Application Factory (Agent 3)

Creates and configures the Flask app:
  1. Loads .env
  2. Sets up CORS
  3. Registers blueprints (AI + payment from Agent 3; workout from Agent 2)
  4. Applies x402 middleware to POST /api/payment/session
  5. Returns the app

Agent 2 (CV backend) will register their workout blueprint here.
We leave a clearly-marked placeholder for it.
"""

from __future__ import annotations

import os
import logging

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env before anything else
load_dotenv()

logging.basicConfig(
    level=logging.DEBUG if os.getenv("FLASK_DEBUG", "0") == "1" else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)

    # ── CORS ────────────────────────────────────────────────────────
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS(
        app,
        resources={r"/api/*": {"origins": [frontend_url, "http://localhost:5173", "http://localhost:3000"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "X-PAYMENT", "Authorization"],
        expose_headers=["Content-Length", "Content-Type"],
    )

    # ── Blueprints — Agent 3 (AI + Payment) ─────────────────────────
    from .routes.ai import ai_bp
    from .routes.payment import payment_bp

    app.register_blueprint(ai_bp)
    app.register_blueprint(payment_bp)

    # ── Blueprint — Agent 2 (CV + Workout) ──────────────────────────
    # Agent 2 should register their blueprint here.
    # Example (uncomment when Agent 2's code is in place):
    #
    #   from .routes.workout import workout_bp
    #   app.register_blueprint(workout_bp)
    #
    try:
        from .routes.workout import workout_bp  # type: ignore
        app.register_blueprint(workout_bp)
        logger.info("Agent 2 workout blueprint registered.")
    except ImportError:
        logger.info(
            "Agent 2 workout routes not yet available — "
            "workout endpoints will be registered when Agent 2 merges."
        )

    # ── Health check ────────────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "gym-buddy-backend"}), 200

    # ── x402 Middleware ─────────────────────────────────────────────
    # Must be applied AFTER all routes are registered.
    from .payment.x402_service import apply_x402_middleware
    apply_x402_middleware(app)

    logger.info("Gym Buddy backend ready.")
    return app
