"""
Gym Buddy — x402 Configuration
Reads payment-related environment variables and exposes typed config.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class X402Config:
    network: str
    receiver_address: str
    facilitator_url: str
    price: str          # e.g. "0.1"
    asset: str          # "ALGO" or ASA ID
    algorand_node_url: str
    algorand_indexer_url: str


def load_x402_config() -> X402Config:
    """Load x402 config from environment variables.

    All values have safe defaults so the server starts even without .env.
    In production, always set X402_RECEIVER_ADDRESS.
    """
    return X402Config(
        network=os.getenv("X402_NETWORK", "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="),
        receiver_address=os.getenv("X402_RECEIVER_ADDRESS", ""),
        facilitator_url=os.getenv(
            "X402_FACILITATOR_URL", "https://facilitator.goplausible.xyz"
        ),
        price=os.getenv("X402_PRICE", "0.005"),
        asset=os.getenv("X402_ASSET", "10458941"),
        algorand_node_url=os.getenv(
            "ALGORAND_NODE_URL", "https://testnet-api.algonode.cloud"
        ),
        algorand_indexer_url=os.getenv(
            "ALGORAND_INDEXER_URL", "https://testnet-idx.algonode.cloud"
        ),
    )


# Module-level singleton — import this everywhere
x402_config = load_x402_config()
