"""
Gym Buddy Flask application factory.
"""
from flask import Flask
from flask_cors import CORS
import os


def create_app() -> Flask:
    app = Flask(__name__)

    # CORS — allow frontend dev server and any configured origins
    origins = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
    ).split(",")
    CORS(app, resources={r"/api/*": {"origins": origins}})

    # Register blueprints
    from app.routes.workout import workout_bp
    app.register_blueprint(workout_bp)

    @app.get("/health")
    def health():  # noqa: ANN202
        return {"status": "ok", "agent": "cv-backend"}

    return app
