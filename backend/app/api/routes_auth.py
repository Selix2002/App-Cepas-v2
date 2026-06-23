from __future__ import annotations

import logging
from typing import Annotated

from litestar import Controller, post, Request, Response
from litestar.contrib.jwt import OAuth2Login
from litestar.di import Provide
from litestar.exceptions import NotAuthorizedException
from litestar.params import Body
from litestar.enums import RequestEncodingType

from app.schema.auth_dto import LoginDTO
from app.repositories.user_repository import UserRepository
from app.core.security import oauth2_auth
from app.services.auth_service import authenticate_user

# L1: los eventos de login son de seguridad → al logger que persiste a archivo (rate_limit.log)
rate_logger = logging.getLogger("rate_limit")

# Mismo set de proxies confiables que los middlewares (S6/S16). Honra X-Forwarded-For
# solo si la conexión directa viene de un proxy confiable; si no, usa la IP del socket.
_TRUSTED_PROXIES = {"127.0.0.1"}


def _client_ip(request: Request) -> str:
    client = request.client
    direct_ip = client.host if client else None
    if direct_ip in _TRUSTED_PROXIES:
        xff = request.headers.get("x-forwarded-for")
        if xff and xff.split(",")[0].strip():
            return xff.split(",")[0].strip()
    return direct_ip or "unknown"


def user_repository() -> UserRepository:
    return UserRepository()


class AuthController(Controller):
    path = "/auth"
    tags = ["auth"]

    @post(
        "/login",
        dependencies={"repo": Provide(user_repository, sync_to_thread=False)},
    )
    async def login(
        self,
        data: Annotated[LoginDTO, Body(media_type=RequestEncodingType.URL_ENCODED)],
        repo: UserRepository,
        request: Request,
    ) -> Response[OAuth2Login]:
        """
        Login con username y password (x-www-form-urlencoded).
        Retorna un JWT si las credenciales son válidas.
        """
        ip = _client_ip(request)

        user = await authenticate_user(
            repo=repo,
            username=data.username,
            password=data.password,
        )

        if user is None:
            # L1: fallo genérico (sin distinguir motivo) para no filtrar enumeración a los logs
            rate_logger.warning(f"LOGIN FALLIDO | username={data.username!r} | ip={ip}")
            raise NotAuthorizedException(detail="Usuario o contraseña incorrectos")

        rate_logger.info(f"LOGIN OK | username={user.username!r} | ip={ip}")
        return oauth2_auth.login(identifier=user.username)