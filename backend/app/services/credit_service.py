"""
Gym Buddy — AI Credit Tracking Service
Stores AI credits in MongoDB.
"""

from typing import Dict, Optional, TypedDict
from app.db import get_db
from bson.objectid import ObjectId

class AICreditSession(TypedDict):
    credits: int
    model_name: str
    tier: str

def get_credits(user_id: str) -> Optional[AICreditSession]:
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
        
    ai_state = user.get("ai_state", {})
    return {
        "credits": ai_state.get("credits", 0),
        "model_name": ai_state.get("model_name", "gemini-flash-lite-latest"),
        "tier": ai_state.get("tier", "basic")
    }

def add_credits(user_id: str, amount: int, model_name: str, tier: str) -> AICreditSession:
    db = get_db()
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$inc": {"ai_state.credits": amount},
            "$set": {
                "ai_state.model_name": model_name,
                "ai_state.tier": tier
            }
        }
    )
    return get_credits(user_id)

def deduct_credit(user_id: str) -> bool:
    """Deduct one credit. Return True if successful, False if out of credits."""
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user or user.get("ai_state", {}).get("credits", 0) <= 0:
        return False
        
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"ai_state.credits": -1}}
    )
    return True
