# app/ia/__init__.py
"""
Módulo de IA — chat semántico + feedback.

Punto de entrada único para integrar el módulo en la app principal.
Desactivar: IA_ENABLED=false en .env
"""

from litestar.middleware import DefineMiddleware


def get_ia_route_handlers() -> list:
    from app.ia.router import ChatController
    return [ChatController]


def get_ia_middleware(redis_client) -> list:
    from app.ia.middleware import ChatRateLimitMiddleware
    from app.ia.config import ia_settings
    return [
        DefineMiddleware(
            ChatRateLimitMiddleware,
            max_requests=ia_settings.CHAT_RATE_LIMIT_REQUESTS,
            window_seconds=ia_settings.CHAT_RATE_LIMIT_SECONDS,
            redis_client=redis_client,
        )
    ]


def get_ia_models() -> list:
    from app.ia.models import ChatFeedback
    return [ChatFeedback]
