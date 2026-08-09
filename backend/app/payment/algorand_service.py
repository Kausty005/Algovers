"""
Gym Buddy — Algorand Service
Lightweight wrapper around algosdk for Algorand TestNet interactions.

Responsibilities:
- Generate payment session info (address, amount, network)
- Track in-memory payment session state (dev/hackathon)
- Check on-chain transaction confirmation via Indexer API

Note: In a production system, session state would live in a database.
For this hackathon demo, an in-memory dict is acceptable.
"""

from __future__ import annotations

import uuid
import time
import logging
import requests
from dataclasses import dataclass, field
from typing import Optional

from .x402_config import x402_config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

@dataclass
class PaymentSession:
    session_id: str
    exercise: str
    payment_address: str
    amount: str
    asset: str
    network: str
    status: str          # idle | required | processing | verified | failed
    created_at: float = field(default_factory=time.time)
    tx_id: Optional[str] = None


# In-memory store: session_id → PaymentSession
_sessions: dict[str, PaymentSession] = {}

# Global "active verified session" for per-request x402 flow:
# after the x402 middleware verifies payment, we mark the workout session here.
_verified_workout_sessions: set[str] = set()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


class AlgorandService:
    """Wraps algosdk + Indexer REST for session payment management."""

    def create_payment_session(self, exercise: str) -> PaymentSession:
        """Create a new pending payment session."""
        session_id = f"pay-{uuid.uuid4().hex[:12]}"
        session = PaymentSession(
            session_id=session_id,
            exercise=exercise,
            payment_address=x402_config.receiver_address or "PLACEHOLDER_SET_X402_RECEIVER_ADDRESS_IN_ENV",
            amount=x402_config.price,
            asset=x402_config.asset,
            network=f"algorand-{x402_config.network}",
            status="required",
        )
        _sessions[session_id] = session
        logger.info("Created payment session %s for exercise=%s", session_id, exercise)
        return session

    def get_session(self, session_id: str) -> Optional[PaymentSession]:
        return _sessions.get(session_id)

    def mark_verified(self, session_id: str, tx_id: str | None = None) -> None:
        """Mark a payment session as verified (called by x402 middleware or manually)."""
        if session_id in _sessions:
            _sessions[session_id].status = "verified"
            _sessions[session_id].tx_id = tx_id
            _verified_workout_sessions.add(session_id)
            logger.info("Payment session %s verified (tx=%s)", session_id, tx_id)

    def mark_failed(self, session_id: str) -> None:
        if session_id in _sessions:
            _sessions[session_id].status = "failed"
            logger.warning("Payment session %s failed", session_id)

    def is_verified(self, session_id: str) -> bool:
        return session_id in _verified_workout_sessions

    def get_current_status(self) -> dict:
        """Return status for the most recent session, or idle."""
        if not _sessions:
            return {
                "status": "idle",
                "sessionId": None,
                "network": f"algorand-{x402_config.network}",
                "price": x402_config.price,
                "asset": x402_config.asset,
                "receiverAddress": x402_config.receiver_address,
            }
        # Return the most recent session
        latest = max(_sessions.values(), key=lambda s: s.created_at)
        return {
            "status": latest.status,
            "sessionId": latest.session_id,
            "network": latest.network,
            "price": latest.amount,
            "asset": latest.asset,
            "receiverAddress": latest.payment_address,
        }

    def check_on_chain_tx(self, tx_id: str) -> bool:
        """Check Algorand Indexer to confirm a transaction.

        Returns True if the transaction is confirmed.
        This is a lightweight check using the public Indexer REST API.
        """
        try:
            url = f"{x402_config.algorand_indexer_url}/v2/transactions/{tx_id}"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                confirmed_round = data.get("transaction", {}).get("confirmed-round", 0)
                return confirmed_round > 0
            return False
        except Exception as exc:
            logger.warning("On-chain tx check failed for %s: %s", tx_id, exc)
            return False


# Singleton
algorand_service = AlgorandService()
