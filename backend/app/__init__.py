"""
Gym Buddy — Flask Application Factory
Combines Agent 2 (CV + Workout) and Agent 3 (AI + x402) blueprints.
"""

from __future__ import annotations

import os
import logging

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from flask_jwt_extended import JWTManager
from .db import init_db

load_dotenv()

logging.basicConfig(
    level=logging.DEBUG if os.getenv("FLASK_DEBUG", "0") == "1" else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'super-secret-key-change-in-prod')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False # Disable expiration for simplicity or set to timedelta
    
    jwt = JWTManager(app)
    
    # Initialize DB
    init_db(app)

    # ── CORS ─────────────────────────────────────────────────────────
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS(
        app,
        resources={r"/api/*": {"origins": [frontend_url, "http://localhost:5173", "http://localhost:3000"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "X-PAYMENT", "PAYMENT-SIGNATURE", "Authorization"],
        expose_headers=["Content-Length", "Content-Type", "PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
    )

    # ── Agent 3: AI + Payment blueprints ─────────────────────────────
    from .routes.ai import ai_bp
    from .routes.payment import payment_bp
    from .routes.agent import agent_bp
    app.register_blueprint(ai_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(agent_bp)

    from .routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # ── Agent 2: CV + Workout blueprint ──────────────────────────────
    from .routes.workout import workout_bp
    app.register_blueprint(workout_bp)
    logger.info("Workout blueprint registered.")

    # ── Health check ──────────────────────────────────────────────────
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "gym-buddy-backend"}), 200

    # ── x402 Middleware (applied after all routes) ────────────────────
    from .payment.x402_service import apply_x402_middleware
    apply_x402_middleware(app)

    logger.info("Gym Buddy backend ready.")
    return app
