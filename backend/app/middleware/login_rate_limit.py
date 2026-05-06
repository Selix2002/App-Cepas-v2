from __future__ import annotations

import json
import logging
from typing import Any

from litestar.types import ASGIApp, Receive, Scope, Send
from redis.asyncio import Redis

rate_logger = logging.getLogger("rate_limit")


class LoginRateLimitMiddleware:
    """
    Rate limiting para POST /auth/login usando Redis.

    - max_requests: intentos permitidos por ventana
    - window_seconds: tamaño de la ventana en segundos
    - key_prefix: prefijo para las claves en Redis
    """

    _logged_init: bool = False  # Litestar instancia el middleware una vez por ruta

    def __init__(
        self,
        app: ASGIApp,
        redis_client: Redis,
        max_requests: int = 5,
        window_seconds: int = 60,
        key_prefix: str = "login_attempts",
        **_: Any,  # por si Litestar pasa más kwargs
    ) -> None:
        self.app = app
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix

        if not LoginRateLimitMiddleware._logged_init:
            rate_logger.info(
                f"LoginRateLimitMiddleware con Redis inicializado "
                f"(max_requests={self.max_requests}, window={self.window_seconds}s)"
            )
            LoginRateLimitMiddleware._logged_init = True

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Sólo para tráfico HTTP
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        method: str = scope.get("method", "GET").upper()

        # Sólo rate limit a POST /auth/login
        if not (path == "/auth/login" and method == "POST"):
            await self.app(scope, receive, send)
            return

        client_ip = self._get_client_ip(scope)
        key = f"{self.key_prefix}:{client_ip}"

        # B15: INCR + EXPIRE en un solo script Lua para eliminar la race condition
        _LUA_INCR_EXPIRE = (
            "local n = redis.call('INCR', KEYS[1]) "
            "if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end "
            "return n"
        )
        try:
            current = await self.redis.eval(_LUA_INCR_EXPIRE, 1, key, self.window_seconds)
        except Exception as e:
            # Si Redis falla, no queremos tirar abajo el login (fail-open)
            rate_logger.error(f"Error al acceder a Redis para rate limit: {e}")
            await self.app(scope, receive, send)
            return

        # Si excede el límite -> WARNING y 429
        if current > self.max_requests:
            ttl = await self.redis.ttl(key)
            retry_after = ttl if ttl and ttl > 0 else self.window_seconds

            rate_logger.warning(
                f"LOGIN BLOQUEADO por rate limit. "
                f"IP={client_ip}, contador={current}, retry_after={retry_after}s"
            )
            await self._send_too_many_requests(send, retry_after)
            return

        # Dentro del límite → continuar hacia el handler
        rate_logger.info(
            f"Login permitido por rate limit. "
            f"IP={client_ip}, contador={current}/{self.max_requests}"
        )

        await self.app(scope, receive, send)

    def _get_client_ip(self, scope: Scope) -> str:
        headers = scope.get("headers", [])
        headers_dict = {k.lower(): v for k, v in headers}

        xff = headers_dict.get(b"x-forwarded-for")
        if xff:
            ip = xff.decode("latin1").split(",")[0].strip()
            if ip:
                return ip

        client = scope.get("client")
        if client and isinstance(client, tuple):
            return client[0]

        return "unknown"

    async def _send_too_many_requests(self, send: Send, retry_after: int) -> None:
        body = json.dumps(
            {
                "detail": "Demasiados intentos de login. Inténtalo de nuevo más tarde.",
                "retry_after_seconds": retry_after,
            }
        ).encode("utf-8")

        headers = [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"retry-after", str(retry_after).encode("ascii")),
        ]

        await send(
            {
                "type": "http.response.start",
                "status": 429,
                "headers": headers,
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": body,
                "more_body": False,
            }
        )
