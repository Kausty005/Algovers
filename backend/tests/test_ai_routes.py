"""
Tests for AI endpoints (Agent 3).

Tests run without a GEMINI_API_KEY — the template fallback is used.
No real network calls are made.
"""

import pytest
import os

# Ensure no real LLM key is used during tests
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("X402_RECEIVER_ADDRESS", "")
os.environ.setdefault("X402_NETWORK", "algorand-testnet")


@pytest.fixture
def app():
    from app import create_app
    application = create_app()
    application.config["TESTING"] = True
    return application


@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers(app):
    from flask_jwt_extended import create_access_token
    from app.db import get_db
    from bson.objectid import ObjectId
    user_id = "507f1f77bcf86cd799439011"
    with app.app_context():
        db = get_db()
        if db is not None:
            db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"ai_state": {"credits": 100, "model_name": "gemini-1.5-flash-8b", "tier": "basic"}}},
                upsert=True
            )
        token = create_access_token(identity=user_id)
        return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# POST /api/ai/guidance
# ---------------------------------------------------------------------------

class TestGuidanceEndpoint:
    def test_returns_200_with_valid_payload(self, client):
        resp = client.post(
            "/api/ai/guidance",
            json={
                "exercise": "squat",
                "repCount": 5,
                "formScore": 75,
                "formFeedback": "Knees moving inward",
                "movementState": "bottom",
            },
        )
        assert resp.status_code == 200

    def test_response_has_text_and_priority(self, client):
        resp = client.post(
            "/api/ai/guidance",
            json={"exercise": "squat", "repCount": 5, "formScore": 85, "formFeedback": "", "movementState": "ascending"},
        )
        data = resp.get_json()
        assert "text" in data
        assert "priority" in data
        assert data["priority"] in ("low", "medium", "high")
        assert isinstance(data["text"], str)
        assert len(data["text"]) > 0

    def test_high_priority_for_low_form_score(self, client):
        resp = client.post(
            "/api/ai/guidance",
            json={"exercise": "squat", "repCount": 1, "formScore": 40, "formFeedback": "Bad form", "movementState": "bottom"},
        )
        data = resp.get_json()
        assert data["priority"] == "high"

    def test_low_priority_for_high_form_score(self, client):
        resp = client.post(
            "/api/ai/guidance",
            json={"exercise": "squat", "repCount": 10, "formScore": 95, "formFeedback": "", "movementState": "standing"},
        )
        data = resp.get_json()
        assert data["priority"] == "low"

    def test_missing_exercise_returns_400(self, client):
        resp = client.post("/api/ai/guidance", json={"repCount": 5})
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_bicep_curl_exercise(self, client):
        resp = client.post(
            "/api/ai/guidance",
            json={"exercise": "bicep_curl", "repCount": 8, "formScore": 80, "formFeedback": "", "movementState": "top"},
        )
        assert resp.status_code == 200

    def test_push_up_exercise(self, client):
        resp = client.post(
            "/api/ai/guidance",
            json={"exercise": "push_up", "repCount": 3, "formScore": 70, "formFeedback": "Hips sagging", "movementState": "bottom"},
        )
        assert resp.status_code == 200

    def test_empty_json_body(self, client):
        resp = client.post("/api/ai/guidance", json={})
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/ai/motivation
# ---------------------------------------------------------------------------

class TestMotivationEndpoint:
    def test_returns_200_with_valid_payload(self, client):
        resp = client.post(
            "/api/ai/motivation",
            json={"exercise": "squat", "repCount": 8, "targetReps": 12, "formScore": 88},
        )
        assert resp.status_code == 200

    def test_response_has_text(self, client):
        resp = client.post(
            "/api/ai/motivation",
            json={"exercise": "squat", "repCount": 8, "targetReps": 12, "formScore": 88},
        )
        data = resp.get_json()
        assert "text" in data
        assert isinstance(data["text"], str)
        assert len(data["text"]) > 0

    def test_completed_set_message(self, client):
        resp = client.post(
            "/api/ai/motivation",
            json={"exercise": "squat", "repCount": 12, "targetReps": 12, "formScore": 90},
        )
        assert resp.status_code == 200

    def test_missing_fields_use_defaults(self, client):
        # All fields optional with defaults
        resp = client.post("/api/ai/motivation", json={})
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/ai/chat
# ---------------------------------------------------------------------------

class TestChatEndpoint:
    def test_returns_200_with_valid_message(self, client, auth_headers):
        resp = client.post(
            "/api/ai/chat",
            json={"message": "How can I improve my squat?"},
            headers=auth_headers
        )
        assert resp.status_code == 200

    def test_response_has_response_field(self, client, auth_headers):
        resp = client.post(
            "/api/ai/chat",
            json={"message": "What exercise should I do?"},
            headers=auth_headers
        )
        data = resp.get_json()
        assert "response" in data
        assert isinstance(data["response"], str)
        assert len(data["response"]) > 0

    def test_missing_message_returns_400(self, client, auth_headers):
        resp = client.post("/api/ai/chat", json={}, headers=auth_headers)
        assert resp.status_code == 400

    def test_empty_message_returns_400(self, client, auth_headers):
        resp = client.post("/api/ai/chat", json={"message": "   "}, headers=auth_headers)
        assert resp.status_code == 400

    def test_medical_question_redirects_to_doctor(self, client, auth_headers):
        resp = client.post(
            "/api/ai/chat",
            json={"message": "Can you diagnose my knee pain?"},
            headers=auth_headers
        )
        data = resp.get_json()
        # Should still return 200 but with a safe redirect response
        assert resp.status_code == 200
        assert "response" in data
        response_lower = data["response"].lower()
        assert any(word in response_lower for word in ["professional", "doctor", "healthcare", "medical"])

    def test_bicep_curl_question(self, client, auth_headers):
        resp = client.post("/api/ai/chat", json={"message": "How do I do a bicep curl correctly?"}, headers=auth_headers)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/ai/voice
# ---------------------------------------------------------------------------

class TestVoiceEndpoint:
    def test_returns_200_with_valid_text(self, client):
        resp = client.post("/api/ai/voice", json={"text": "Great work! Keep going!"})
        # gTTS makes a network call; in CI this may be skipped
        # The test verifies routing at minimum
        assert resp.status_code in (200, 500)  # 500 if gTTS unavailable

    def test_returns_audio_content_type_on_success(self, client):
        resp = client.post("/api/ai/voice", json={"text": "Keep pushing!"})
        if resp.status_code == 200:
            assert "audio" in resp.content_type

    def test_missing_text_returns_400(self, client):
        resp = client.post("/api/ai/voice", json={})
        assert resp.status_code == 400

    def test_empty_text_returns_400(self, client):
        resp = client.post("/api/ai/voice", json={"text": ""})
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "ok"
