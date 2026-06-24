from __future__ import annotations

import json
import logging
from typing import Any
from urllib.parse import parse_qs

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
    _LUA_INCR_EXPIRE: str = (
        "local n = redis.call('INCR', KEYS[1]) "
        "if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end "
        "return n"
    )

    def __init__(
        self,
        app: ASGIApp,
        redis_client: Redis,
        max_requests: int = 5,
        window_seconds: int = 60,
        key_prefix: str = "login_attempts",
        trusted_proxies: set[str] | None = None,
        max_requests_user: int = 10,
        window_seconds_user: int = 300,
        key_prefix_user: str = "login_attempts_user",
        **_: Any,  # por si Litestar pasa más kwargs
    ) -> None:
        self.app = app
        self.redis = redis_client
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.key_prefix = key_prefix
        self.trusted_proxies: set[str] = trusted_proxies or set()
        self.max_requests_user = max_requests_user
        self.window_seconds_user = window_seconds_user
        self.key_prefix_user = key_prefix_user
        if not LoginRateLimitMiddleware._logged_init:
            rate_logger.info(
                f"LoginRateLimitMiddleware con Redis inicializado "
                f"(max_requests={self.max_requests}, window={self.window_seconds}s)"
            )
            LoginRateLimitMiddleware._logged_init = True
            
    async def _send_service_unavailable(self, send: Send) -> None:
        body = json.dumps({
            "detail": "Servicio temporalmente no disponible. Inténtalo de nuevo en unos momentos.",
        }).encode("utf-8")

        await send({
            "type": "http.response.start",
            "status": 503,
            "headers": [(b"content-type", b"application/json; charset=utf-8")],
        })
        await send({
            "type": "http.response.body",
            "body": body,
            "more_body": False,
        })

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")
        method: str = scope.get("method", "GET").upper()

        if not (path == "/auth/login" and method == "POST"):
            await self.app(scope, receive, send)
            return

        # Leer body para extraer username; replay para que el handler pueda leerlo
        body = b""
        while True:
            message = await receive()
            body += message.get("body", b"")
            if not message.get("more_body", False):
                break

        async def replay_receive() -> dict:
            return {"type": "http.request", "body": body, "more_body": False}

        params = parse_qs(body.decode("utf-8", errors="ignore"))
        username = params.get("username", [""])[0].strip().lower()

        client_ip = self._get_client_ip(scope)

        # Límite por IP
        ip_key = f"{self.key_prefix}:{client_ip}"
        try:
            current_ip = await self.redis.eval(self._LUA_INCR_EXPIRE, 1, ip_key, self.window_seconds)
        except Exception as e:
            rate_logger.error(f"Redis no disponible para rate limit de login | ip={client_ip} | error={e}")
            await self._send_service_unavailable(send)
            return

        if current_ip > self.max_requests:
            ttl = await self.redis.ttl(ip_key)
            retry_after = ttl if ttl and ttl > 0 else self.window_seconds
            rate_logger.warning(
                f"LOGIN BLOQUEADO por IP. "
                f"ip={client_ip}, contador={current_ip}, retry_after={retry_after}s"
            )
            await self._send_too_many_requests(send, retry_after)
            return

        # Límite por username, acotado por IP (S20). La clave incluye la IP del cliente para
        # que un atacante solo pueda saturar el bucket (username, su_IP) y NO bloquear al
        # usuario real desde su propia IP → elimina el DoS de bloqueo de cuenta. El límite por
        # IP de arriba sigue siendo el backstop contra brute-force.
        if username:
            user_key = f"{self.key_prefix_user}:{username}:{client_ip}"
            try:
                current_user = await self.redis.eval(self._LUA_INCR_EXPIRE, 1, user_key, self.window_seconds_user)
            except Exception as e:
                rate_logger.error(f"Redis no disponible para rate limit de login | username={username} | error={e}")
                await self._send_service_unavailable(send)
                return

            if current_user > self.max_requests_user:
                ttl = await self.redis.ttl(user_key)
                retry_after = ttl if ttl and ttl > 0 else self.window_seconds_user
                rate_logger.warning(
                    f"LOGIN BLOQUEADO por username. "
                    f"username={username}, ip={client_ip}, contador={current_user}, retry_after={retry_after}s"
                )
                await self._send_too_many_requests(send, retry_after)
                return

        rate_logger.info(
            f"Login permitido. ip={client_ip}, ip_count={current_ip}/{self.max_requests}"
        )

        await self.app(scope, replay_receive, send)

    def _get_client_ip(self, scope: Scope) -> str:
        client = scope.get("client")
        direct_ip = client[0] if client and isinstance(client, tuple) else None

        if direct_ip in self.trusted_proxies:
            headers_dict = {k.lower(): v for k, v in scope.get("headers", [])}
            xff = headers_dict.get(b"x-forwarded-for")
            if xff:
                ip = xff.decode("latin1").split(",")[0].strip()
                if ip:
                    return ip

        return direct_ip or "unknown"

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
