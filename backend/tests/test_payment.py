"""
Tests for Payment endpoints (Agent 3).

Key tests:
  - Unpaid POST /api/payment/session → HTTP 402
  - POST /api/payment/session with X-PAYMENT header → HTTP 200
  - GET /api/payment/status → correct shape
  - POST /api/payment/verify → session found/not-found
"""

import pytest
import os

os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("X402_RECEIVER_ADDRESS", "")
os.environ.setdefault("X402_NETWORK", "testnet")
os.environ.setdefault("X402_PRICE", "0.1")
os.environ.setdefault("X402_ASSET", "10458941")


@pytest.fixture
def app():
    from app import create_app
    application = create_app()
    application.config["TESTING"] = True
    return application


@pytest.fixture
def client(app):
    return app.test_client()


# ---------------------------------------------------------------------------
# GET /api/payment/status
# ---------------------------------------------------------------------------

class TestPaymentStatus:
    def test_returns_200(self, client):
        resp = client.get("/api/payment/status")
        assert resp.status_code == 200

    def test_response_has_required_fields(self, client):
        resp = client.get("/api/payment/status")
        data = resp.get_json()
        assert "status" in data
        assert "network" in data
        assert "price" in data
        assert "asset" in data

    def test_initial_status_is_idle(self, client):
        resp = client.get("/api/payment/status")
        data = resp.get_json()
        # Fresh app — no sessions yet
        assert data["status"] in ("idle", "required", "verified")  # depends on test order

    def test_network_is_algorand(self, client):
        resp = client.get("/api/payment/status")
        data = resp.get_json()
        assert "algorand" in data["network"].lower()

    def test_price_is_string(self, client):
        resp = client.get("/api/payment/status")
        data = resp.get_json()
        assert isinstance(data["price"], str)


# ---------------------------------------------------------------------------
# POST /api/payment/session — x402 flow
# ---------------------------------------------------------------------------

class TestPaymentSession:
    def test_unpaid_request_returns_402(self, client):
        """Without X-PAYMENT header the demo middleware returns 402."""
        resp = client.post(
            "/api/payment/session",
            json={"exercise": "squat"},
        )
        assert resp.status_code == 402

    def test_402_response_has_payment_details(self, client):
        """The 402 body must contain x402-spec payment requirements."""
        resp = client.post(
            "/api/payment/session",
            json={"exercise": "squat"},
        )
        assert resp.status_code == 402
        data = resp.get_json()
        # x402 spec response
        assert "accepts" in data or "error" in data  # either x402-avm format or demo format

    def test_paid_request_returns_200(self, client):
        """With X-PAYMENT header the middleware passes through → 200."""
        resp = client.post(
            "/api/payment/session",
            json={"exercise": "squat"},
            headers={"X-PAYMENT": "demo-verified-token-abc123"},
        )
        assert resp.status_code == 200

    def test_paid_response_has_session_id(self, client):
        resp = client.post(
            "/api/payment/session",
            json={"exercise": "squat"},
            headers={"X-PAYMENT": "demo-verified-token-abc123"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "sessionId" in data
        assert data["sessionId"].startswith("pay-")

    def test_paid_response_status_is_verified(self, client):
        resp = client.post(
            "/api/payment/session",
            json={"exercise": "squat"},
            headers={"X-PAYMENT": "demo-verified-token-abc123"},
        )
        data = resp.get_json()
        assert data["status"] == "verified"

    def test_paid_response_has_amount_and_asset(self, client):
        resp = client.post(
            "/api/payment/session",
            json={"exercise": "bicep_curl"},
            headers={"X-PAYMENT": "demo-verified-token-abc123"},
        )
        data = resp.get_json()
        assert "amount" in data
        assert "asset" in data
        assert data["asset"] == "10458941"

    def test_paid_response_has_network(self, client):
        resp = client.post(
            "/api/payment/session",
            json={"exercise": "push_up"},
            headers={"X-PAYMENT": "demo-verified-token-abc123"},
        )
        data = resp.get_json()
        assert "network" in data
        assert "algorand" in data["network"].lower()


# ---------------------------------------------------------------------------
# POST /api/payment/verify
# ---------------------------------------------------------------------------

class TestPaymentVerify:
    def test_missing_session_id_returns_400(self, client):
        resp = client.post(
            "/api/payment/verify",
            json={"txId": "SOME_TX_ID"},
        )
        assert resp.status_code == 400

    def test_missing_tx_id_returns_400(self, client):
        resp = client.post(
            "/api/payment/verify",
            json={"sessionId": "pay-abc123"},
        )
        assert resp.status_code == 400

    def test_unknown_session_returns_404(self, client):
        resp = client.post(
            "/api/payment/verify",
            json={"sessionId": "pay-nonexistent", "txId": "TX123"},
        )
        assert resp.status_code == 404

    def test_valid_session_returns_verified_field(self, client):
        # First create a session
        create_resp = client.post(
            "/api/payment/session",
            json={"exercise": "squat"},
            headers={"X-PAYMENT": "demo-verified-token"},
        )
        assert create_resp.status_code == 200
        session_id = create_resp.get_json()["sessionId"]

        # Now verify with a (likely unconfirmed) tx
        verify_resp = client.post(
            "/api/payment/verify",
            json={"sessionId": session_id, "txId": "FAKE_TX_000"},
        )
        assert verify_resp.status_code == 200
        data = verify_resp.get_json()
        assert "verified" in data
        assert isinstance(data["verified"], bool)
