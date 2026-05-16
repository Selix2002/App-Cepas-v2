# app/ia/middleware.py

from __future__ import annotations

import json
import logging
from typing import Any

from litestar.types import ASGIApp, Receive, Scope, Send
from redis.asyncio import Redis

rate_logger = logging.getLogger("rate_limit")


class ChatRateLimitMiddleware:
    """
    Rate limiting para POST /chat/query usando Redis.
    Clave por IP (no por usuario) para cubrir también requests no autenticados.

    - max_requests: requests permitidos por ventana
    - window_seconds: tamaño de la ventana en segundos
    """

    _logged_init: bool = False  # Litestar instancia el middleware una vez por ruta
    _LUA_INCR_EXPIRE: str = (
        "local n = redis.call('INCR', KEYS[1]) "
        "if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end "
        "return n"
    )


    def __init__(
        self,
        app: ASGIApp,
        redis_client: Redis,
        max_requests: int = 10,
        window_seconds: int = 60,
        key_prefix: str = "chat_requests",
        
        **_: Any,
    ) -> None:
        self.app = app
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix

        if not ChatRateLimitMiddleware._logged_init:
            rate_logger.info(
                f"ChatRateLimitMiddleware inicializado "
                f"(max_requests={self.max_requests}, window={self.window_seconds}s)"
            )
            ChatRateLimitMiddleware._logged_init = True

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        method: str = scope.get("method", "GET").upper()

        if not (path == "/chat/query" and method == "POST"):
            await self.app(scope, receive, send)
            return

        client_ip = self._get_client_ip(scope)
        key = f"{self.key_prefix}:{client_ip}"

        try:
            current = await self.redis.eval(self._LUA_INCR_EXPIRE, 1, key, self.window_seconds)
        except Exception as e:
            rate_logger.error(f"Redis no disponible para rate limit de chat | ip={client_ip} | error={e}")
            await self._send_service_unavailable(send)
            return

        if current > self.max_requests:
            ttl = await self.redis.ttl(key)
            retry_after = ttl if ttl and ttl > 0 else self.window_seconds
            rate_logger.warning(
                f"CHAT BLOQUEADO por rate limit. "
                f"IP={client_ip}, contador={current}/{self.max_requests}, "
                f"retry_after={retry_after}s"
            )
            await self._send_too_many_requests(send, retry_after)
            return

        rate_logger.debug(
            f"Chat permitido. IP={client_ip}, contador={current}/{self.max_requests}"
        )
        await self.app(scope, receive, send)

    def _get_client_ip(self, scope: Scope) -> str:
        headers = dict(scope.get("headers", []))
        xff = headers.get(b"x-forwarded-for")
        if xff:
            ip = xff.decode("latin1").split(",")[0].strip()
            if ip:
                return ip
        client = scope.get("client")
        if client and isinstance(client, tuple):
            return client[0]
        return "unknown"

    async def _send_service_unavailable(self, send: Send) -> None:
        body = json.dumps({
            "detail": "Servicio temporalmente no disponible. Inténtalo de nuevo en unos momentos.",
        }).encode("utf-8")
        await send({
            "type": "http.response.start",
            "status": 503,
            "headers": [(b"content-type", b"application/json; charset=utf-8")],
        })
        await send({"type": "http.response.body", "body": body, "more_body": False})

    async def _send_too_many_requests(self, send: Send, retry_after: int) -> None:
        body = json.dumps(
            {
                "detail": "Demasiadas consultas. Espera un momento antes de continuar.",
                "retry_after_seconds": retry_after,
            }
        ).encode("utf-8")

        headers = [
            (b"content-type", b"application/json; charset=utf-8"),
            (b"retry-after", str(retry_after).encode("ascii")),
        ]

        await send({"type": "http.response.start", "status": 429, "headers": headers})
        await send({"type": "http.response.body", "body": body, "more_body": False})
