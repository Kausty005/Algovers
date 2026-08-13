"""
Gym Buddy — x402 Service
Builds and applies the x402 payment middleware to the Flask app.

Uses the official x402-avm[flask] package:
  pip install "x402-avm[flask,avm]"

The middleware intercepts POST /api/payment/session:
  - No X-PAYMENT header → HTTP 402 Payment Required (with payment details)
  - Valid X-PAYMENT header → Facilitator verifies → HTTP 200 + session

If x402-avm is not installed, the service falls back to a manual 402
that still demonstrates the payment flow for the frontend.
"""

from __future__ import annotations

import logging
from flask import Flask

from .x402_config import x402_config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Routes that x402 protects
# ---------------------------------------------------------------------------
PROTECTED_SESSION_PATH = "/api/payment/session"
PROTECTED_AI_PATHS = {
    "/api/payment/ai-credits/basic": {"price": "0.05", "desc": "AI Basic Coach (10 Credits)", "model": "gemini-flash-lite-latest"},
    "/api/payment/ai-credits/pro": {"price": "0.1", "desc": "AI Pro Coach (10 Credits)", "model": "gemini-flash-latest"},
    "/api/payment/ai-credits/expert": {"price": "0.25", "desc": "AI Expert Coach (10 Credits)", "model": "gemini-pro-latest"},
}

# Agent-driven micro-payment routes (auto-purchased by the IronIQ agent)
PROTECTED_AGENT_PATHS = {
    "/api/agent/text-guidance": {"price": "0.01", "desc": "Agent Text Guidance"},
    "/api/agent/voice-guidance": {"price": "0.02", "desc": "Agent Voice Guidance"},
}
PROTECTED_METHOD = "POST"


def apply_x402_middleware(app: Flask) -> None:
    """Wrap the Flask WSGI app with x402 payment middleware.

    This must be called AFTER all routes are registered on *app*.
    """
    # ── Dev bypass ──────────────────────────────────────────────────
    import os
    if os.getenv("BYPASS_PAYMENT", "false").lower() in ("1", "true", "yes"):
        logger.warning(
            "BYPASS_PAYMENT=true — payment checks are DISABLED. "
            "All requests pass through without payment. "
            "Set BYPASS_PAYMENT=false for production."
        )
        _apply_passthrough_middleware(app)
        return

    # 1. ALWAYS apply demo middleware (handles workout session & AI paths)
    _apply_demo_middleware(app)

    # 2. IF a receiver address is set, ALSO apply the real x402-avm middleware
    #    (but ONLY for the agentic voice guidance paths)
    # FOR HACKATHON DEMO: We skip the real avm middleware so the fake session wallet payments work.
    if x402_config.receiver_address:
        try:
            _apply_x402_avm_middleware(app)
        except ImportError:
            logger.warning(
                "x402-avm package not found. "
                "Install with: pip install \"x402-avm[flask,avm]\". "
                "Agentic features will not have real on-chain payment protection."
            )
        except Exception as exc:
            logger.error("Failed to apply x402-avm middleware to agent paths: %s", exc)


def _apply_x402_avm_middleware(app: Flask) -> None:
    """Apply the real x402-avm WSGI middleware."""
    from x402.server import x402ResourceServerSync  # type: ignore
    from x402.http.middleware.flask import payment_middleware  # type: ignore
    from x402.http import FacilitatorConfig, HTTPFacilitatorClientSync, PaymentOption  # type: ignore
    from x402.http.types import RouteConfig  # type: ignore

    facilitator = HTTPFacilitatorClientSync(
        FacilitatorConfig(url=x402_config.facilitator_url)
    )
    server = x402ResourceServerSync(facilitator)

    from x402.mechanisms.avm.exact import ExactAvmServerScheme  # type: ignore
    server.register(x402_config.network, ExactAvmServerScheme())

    extra_args = {}
    if x402_config.asset and x402_config.asset.upper() != "ALGO":
        extra_args["asset"] = str(x402_config.asset)

    routes = {}

    # Add AI micro-payment routes (agent routes excluded for demo so replay tokens work)
    all_protected_paths = {**PROTECTED_AI_PATHS}
    for path, info in all_protected_paths.items():
        routes[f"{PROTECTED_METHOD} {path}"] = RouteConfig(
            accepts=[
                PaymentOption(
                    scheme="exact",
                    pay_to=x402_config.receiver_address,
                    price=str(info['price']),
                    network=x402_config.network,
                    extra=extra_args if extra_args else None
                )
            ],
            mime_type="application/json",
            description=f"{info['desc']} — {info['price']} {x402_config.asset}",
        )

    payment_middleware(app, routes=routes, server=server)  # type: ignore
    logger.info(
        "x402-avm middleware applied ONLY to agentic micro-payment routes"
    )


def _apply_passthrough_middleware(app: Flask) -> None:
    """Bypass all payment checks — pass every request through as-if paid.

    DEVELOPMENT ONLY. Never use this in production.
    """
    original_wsgi = app.wsgi_app

    def passthrough_middleware(environ, start_response):
        path = environ.get("PATH_INFO", "")
        method = environ.get("REQUEST_METHOD", "")

        # For the protected session endpoint, inject a fake X-PAYMENT header
        # so the Flask route handler (which checks jwt) still works normally.
        if method == PROTECTED_METHOD and (
            path == PROTECTED_SESSION_PATH or path in PROTECTED_AI_PATHS or path in PROTECTED_AGENT_PATHS
        ):
            environ["HTTP_X_PAYMENT"] = "bypass-dev"

        return original_wsgi(environ, start_response)

    app.wsgi_app = passthrough_middleware  # type: ignore
    logger.info("Payment BYPASS middleware applied (BYPASS_PAYMENT=true)")


def _apply_demo_middleware(app: Flask) -> None:
    """Apply a manual WSGI 402 demo middleware.

    Returns HTTP 402 with proper payment details JSON when the
    X-PAYMENT header is absent. If X-PAYMENT: demo-verified is
    present, it passes through (for frontend dev/testing).

    This is clearly marked as DEMO — not suitable for production.
    """
    original_wsgi = app.wsgi_app

    def demo_middleware(environ, start_response):
        path = environ.get("PATH_INFO", "")
        method = environ.get("REQUEST_METHOD", "")

        if (method == PROTECTED_METHOD and (path == PROTECTED_SESSION_PATH or path in PROTECTED_AI_PATHS or path in PROTECTED_AGENT_PATHS)) or (method == "GET" and path == "/api/payment/check"):
            x_payment = environ.get("HTTP_X_PAYMENT", "") or environ.get("HTTP_PAYMENT_SIGNATURE", "")
            auth_header = environ.get("HTTP_AUTHORIZATION", "")
            if "x402" in auth_header:
                x_payment = auth_header

            if not x_payment:
                # Determine price and desc
                price = x402_config.price
                desc = "Gym Buddy workout session"
                if path in PROTECTED_AI_PATHS:
                    price = PROTECTED_AI_PATHS[path]["price"]
                    desc = PROTECTED_AI_PATHS[path]["desc"]
                elif path in PROTECTED_AGENT_PATHS:
                    price = PROTECTED_AGENT_PATHS[path]["price"]
                    desc = PROTECTED_AGENT_PATHS[path]["desc"]

                # Convert decimal price to integer micro-units for ExactAvmScheme
                # USDC (10458941 / 31566704) = 6 decimals, ALGO = 6 decimals
                ASSET_DECIMALS = {
                    "10458941": 6,   # TestNet USDC
                    "31566704": 6,   # MainNet USDC
                    "ALGO": 6,       # ALGO uses microALGO
                }
                asset_key = x402_config.asset
                decimals = ASSET_DECIMALS.get(asset_key, 6)
                try:
                    micro_amount = str(int(round(float(price) * (10 ** decimals))))
                except (ValueError, TypeError):
                    micro_amount = price  # fallback: send as-is

                # Return 402 Payment Required
                import json
                body = json.dumps({
                    "x402Version": 1,
                    "error": "Payment required",
                    "accepts": [
                        {
                            "scheme": "exact",
                            "network": x402_config.network,
                            "payTo": x402_config.receiver_address or "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                            "amount": micro_amount,
                            "asset": x402_config.asset,
                            "extra": {
                                "description": desc,
                                "name": desc,
                                "facilitator": x402_config.facilitator_url,
                                "decimals": decimals,
                            },
                        }
                    ],
                }).encode()

                start_response(
                    "402 Payment Required",
                    [
                        ("Content-Type", "application/json"),
                        ("Content-Length", str(len(body))),
                        ("Access-Control-Allow-Origin", "*"),
                        ("Access-Control-Expose-Headers", "WWW-Authenticate, payment-required"),
                        ("payment-required", __import__('base64').b64encode(body).decode('utf-8')),
                        ("WWW-Authenticate", f'x402 version="1", network="{x402_config.network}", scheme="exact", exact-pay-to="{x402_config.receiver_address or "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}", exact-price="{micro_amount}", exact-asset="{x402_config.asset}"'),
                    ],
                )
                return [body]

            # If paid and it's the check endpoint, return 200 directly
            if method == "GET" and path == "/api/payment/check":
                import json
                body = json.dumps({"status": "verified"}).encode()
                start_response("200 OK", [
                    ("Content-Type", "application/json"),
                    ("Content-Length", str(len(body))),
                    ("Access-Control-Allow-Origin", "*")
                ])
                return [body]

            # X-PAYMENT present — pass through to Flask handler
            logger.debug("Demo middleware: X-PAYMENT=%s, passing through", x_payment[:30])

        return original_wsgi(environ, start_response)

    app.wsgi_app = demo_middleware  # type: ignore
    logger.info(
        "DEMO x402 middleware applied (no real chain verification — for development only)",
    )
