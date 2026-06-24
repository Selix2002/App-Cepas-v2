from typing import Any

from litestar.connection import ASGIConnection
from litestar.contrib.jwt import OAuth2PasswordBearerAuth, Token
from litestar.exceptions import NotAuthorizedException
from litestar.handlers import BaseRouteHandler

from app.core.config import settings
from app.models.models import User


async def retrieve_user_handler(
    token: Token,
    _: ASGIConnection[Any, Any, Any, Any],
) -> User:
    user = await User.find_one(User.username == token.sub)
    if not user:
        # S19: el token de un usuario inexistente/borrado es un fallo de AUTORIZACIÓN
        # (401), no un "recurso no encontrado" (404). Sin filtrar si el usuario existía.
        raise NotAuthorizedException(detail="No autorizado")
    return user


oauth2_auth = OAuth2PasswordBearerAuth[User](
    retrieve_user_handler=retrieve_user_handler,
    token_secret=settings.secret_key.get_secret_value(),
    token_url="/auth/login",
    # S21: /schema solo se excluye en debug; en prod la ruta ni siquiera se registra (ver main.py).
    exclude=["/auth/login"] + (["/schema"] if settings.debug else []),
)


def admin_guard(connection: ASGIConnection, _: BaseRouteHandler) -> None:
    """Permite solo usuarios con is_admin=True."""
    user: User | None = getattr(connection, "user", None)
    if not user or not user.is_admin:
        raise NotAuthorizedException(detail="Se requiere rol de administrador")