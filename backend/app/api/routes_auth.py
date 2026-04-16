from __future__ import annotations

from typing import Annotated

from litestar import Controller, post, Response
from litestar.contrib.jwt import OAuth2Login
from litestar.di import Provide
from litestar.exceptions import NotAuthorizedException
from litestar.params import Body
from litestar.enums import RequestEncodingType

from app.schema.auth_dto import LoginDTO
from app.repositories.user_repository import UserRepository
from app.core.security import oauth2_auth
from app.services.auth_service import authenticate_user


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
    ) -> Response[OAuth2Login]:
        """
        Login con username y password (x-www-form-urlencoded).
        Retorna un JWT si las credenciales son válidas.
        """
        user = await authenticate_user(
            repo=repo,
            username=data.username,
            password=data.password,
        )

        if user is None:
            raise NotAuthorizedException(detail="Usuario o contraseña incorrectos")

        return oauth2_auth.login(identifier=user.username)