"""
Gym Buddy — AI Credit Tracking Service
In-memory store for AI credits. In a production app, this would be backed by a database.
"""

from typing import Dict, Optional, TypedDict

class AICreditSession(TypedDict):
    credits: int
    model_name: str
    tier: str

# In-memory store mapping session ID to credit session
_credit_store: Dict[str, AICreditSession] = {}

def get_credits(session_id: str) -> Optional[AICreditSession]:
    return _credit_store.get(session_id)

def add_credits(session_id: str, amount: int, model_name: str, tier: str) -> AICreditSession:
    if session_id in _credit_store:
        _credit_store[session_id]["credits"] += amount
        _credit_store[session_id]["model_name"] = model_name
        _credit_store[session_id]["tier"] = tier
    else:
        _credit_store[session_id] = {
            "credits": amount,
            "model_name": model_name,
            "tier": tier
        }
    return _credit_store[session_id]

def deduct_credit(session_id: str) -> bool:
    """Deduct one credit. Return True if successful, False if out of credits."""
    session = _credit_store.get(session_id)
    if not session or session["credits"] <= 0:
        return False
    session["credits"] -= 1
    return True
