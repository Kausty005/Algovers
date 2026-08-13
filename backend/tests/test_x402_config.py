import pytest
import os
import json
from app import create_app

@pytest.fixture
def client():
    # Ensure test environment uses real config we just set
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_headers(client):
    from flask_jwt_extended import create_access_token
    from app.db import get_db
    with client.application.app_context():
        token = create_access_token(identity="test_user")
        return {"Authorization": f"Bearer {token}"}

def test_x402_payment_required_with_correct_config(client, auth_headers):
    """Test that requesting a session returns 402 with correct x402 configuration."""
    response = client.post("/api/payment/session", json={"exercise": "squat"}, headers=auth_headers)
    
    assert response.status_code == 402
    
    payment_required = response.headers.get("payment-required")
    assert payment_required is not None
    
    import base64
    try:
        data = json.loads(base64.b64decode(payment_required).decode('utf-8'))
    except:
        data = json.loads(payment_required)
    
    assert "accepts" in data
    
    accept = data["accepts"][0]
    assert accept["scheme"] == "exact"
    assert accept["network"] == "algorand-testnet"
    assert accept["asset"] == "10458941"  # TestNet USDC
    assert accept["amount"] == "100000"
    assert "payTo" in accept
    assert accept["payTo"] != "SET_X402_RECEIVER_ADDRESS"
