from litestar import Controller, get, post, patch, delete
from litestar.di import Provide
from litestar.exceptions import NotFoundException, HTTPException
from litestar.status_codes import HTTP_204_NO_CONTENT
from litestar.connection import Request
from litestar.contrib.jwt import Token
from app.models.models import User
from typing import Any

from app.schema.user_dto import (
    UserCreateDTO,
    UserUpdateDTO,
    UserResponseDTO,
    UserListDTO,
)
from app.repositories.user_repository import (
    UserRepository,
    UserNotFoundError,
    UserAlreadyExistsError,
)
from app.core.security import admin_guard


def user_repository() -> UserRepository:
    return UserRepository()


def _to_response(user) -> UserResponseDTO:
    return UserResponseDTO(id=str(user.id), **user.model_dump(exclude={"id"}))


class UserController(Controller):
    path = "/users"
    guards = [admin_guard]   # todos los endpoints requieren admin
    dependencies = {"repo": Provide(user_repository,sync_to_thread=False)}
    
    # ------------------------------------------------------------------
    # GET ME — cualquier usuario autenticado
    # ------------------------------------------------------------------
    @get("/me")
    async def get_my_user(
        self,
        request: Request[User, Token, Any],
    ) -> UserResponseDTO:
        return _to_response(request.user)

    # ------------------------------------------------------------------
    # GET ALL
    # ------------------------------------------------------------------
    @get("/")
    async def get_all(self, repo: UserRepository) -> UserListDTO:
        users, total = await repo.get_all()
        return UserListDTO(
            total=total,
            items=[_to_response(u) for u in users],
        )

    # ------------------------------------------------------------------
    # POST
    # ------------------------------------------------------------------
    @post("/")
    async def create(
        self,
        data: UserCreateDTO,
        repo: UserRepository,
    ) -> UserResponseDTO:
        try:
            user = await repo.create(data)
        except UserAlreadyExistsError as e:
            raise HTTPException(status_code=409, detail=str(e))

        return _to_response(user)

    # ------------------------------------------------------------------
    # PATCH
    # ------------------------------------------------------------------
    @patch("/{user_id:str}")
    async def update(
        self,
        user_id: str,
        data: UserUpdateDTO,
        repo: UserRepository,
    ) -> UserResponseDTO:
        try:
            user = await repo.update(user_id, data)
        except UserNotFoundError as e:
            raise NotFoundException(detail=str(e))
        except UserAlreadyExistsError as e:
            raise HTTPException(status_code=409, detail=str(e))

        return _to_response(user)

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------
    @delete("/{user_id:str}", status_code=HTTP_204_NO_CONTENT)
    async def delete(
        self,
        user_id: str,
        repo: UserRepository,
    ) -> None:
        try:
            await repo.delete(user_id)
        except UserNotFoundError as e:
            raise NotFoundException(detail=str(e))