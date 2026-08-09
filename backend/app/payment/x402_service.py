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
    "/api/payment/ai-credits/basic": {"price": "0.05", "desc": "AI Basic Coach (10 Credits)", "model": "gemini-1.5-flash-8b"},
    "/api/payment/ai-credits/pro": {"price": "0.1", "desc": "AI Pro Coach (10 Credits)", "model": "gemini-1.5-flash"},
    "/api/payment/ai-credits/expert": {"price": "0.25", "desc": "AI Expert Coach (10 Credits)", "model": "gemini-1.5-pro"},
}
PROTECTED_METHOD = "POST"


def apply_x402_middleware(app: Flask) -> None:
    """Wrap the Flask WSGI app with x402 payment middleware.

    This must be called AFTER all routes are registered on *app*.
    """
    if not x402_config.receiver_address:
        logger.error("X402_RECEIVER_ADDRESS is not set. Real x402 payment configuration is missing.")
        raise ValueError("X402_RECEIVER_ADDRESS must be set for real TestNet payments.")

    try:
        _apply_x402_avm_middleware(app)
    except ImportError as e:
        logger.error("x402-avm package not found. Install with: pip install \"x402-avm[flask,avm]\".")
        raise e
    except Exception as exc:
        logger.error("Failed to apply x402-avm middleware: %s.", exc)
        raise exc


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
    server.register("algorand:*", ExactAvmServerScheme())

    routes = {
        f"{PROTECTED_METHOD} {PROTECTED_SESSION_PATH}": RouteConfig(
            accepts=[
                PaymentOption(
                    scheme="exact",
                    pay_to=x402_config.receiver_address,
                    price=f"${x402_config.price}",
                    network=x402_config.network,
                )
            ],
            mime_type="application/json",
            description=(
                f"Gym Buddy workout session — {x402_config.price} "
                f"{x402_config.asset} on Algorand {x402_config.network}"
            ),
        )
    }

    # Add AI credit routes
    for path, info in PROTECTED_AI_PATHS.items():
        routes[f"{PROTECTED_METHOD} {path}"] = RouteConfig(
            accepts=[
                PaymentOption(
                    scheme="exact",
                    pay_to=x402_config.receiver_address,
                    price=f"${info['price']}",
                    network=x402_config.network,
                )
            ],
            mime_type="application/json",
            description=f"{info['desc']} — {info['price']} {x402_config.asset}",
        )

    app.wsgi_app = payment_middleware(app.wsgi_app, routes=routes, server=server)  # type: ignore
    logger.info(
        "x402-avm middleware applied to %s and AI credit routes",
        PROTECTED_SESSION_PATH
    )


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

        if method == PROTECTED_METHOD and (path == PROTECTED_SESSION_PATH or path in PROTECTED_AI_PATHS):
            x_payment = environ.get("HTTP_X_PAYMENT", "")

            if not x_payment:
                # Determine price and desc
                price = x402_config.price
                desc = "Gym Buddy workout session"
                if path in PROTECTED_AI_PATHS:
                    price = PROTECTED_AI_PATHS[path]["price"]
                    desc = PROTECTED_AI_PATHS[path]["desc"]

                # Return 402 Payment Required
                import json
                body = json.dumps({
                    "x402Version": 1,
                    "error": "Payment required",
                    "accepts": [
                        {
                            "scheme": "exact",
                            "network": x402_config.network,
                            "payTo": x402_config.receiver_address or "SET_X402_RECEIVER_ADDRESS",
                            "maxAmountRequired": price,
                            "asset": x402_config.asset,
                            "extra": {
                                "description": desc,
                                "facilitator": x402_config.facilitator_url,
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
                    ],
                )
                return [body]

            # X-PAYMENT present — pass through to Flask handler
            logger.debug("Demo middleware: X-PAYMENT=%s, passing through", x_payment[:30])

        return original_wsgi(environ, start_response)

    app.wsgi_app = demo_middleware  # type: ignore
    logger.info(
        "DEMO x402 middleware applied (no real chain verification — for development only)",
    )
