import asyncio
from datetime import datetime, timezone

from beanie import PydanticObjectId
import bcrypt

from app.models.models import User
from app.schema.user_dto import UserCreateDTO, UserUpdateDTO


class UserNotFoundError(Exception):
    pass


class UserAlreadyExistsError(Exception):
    pass


class UserRepository:

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------
    @staticmethod
    async def _hash_password(plain: str) -> str:
        # S8: bcrypt is CPU-bound; run in thread pool to avoid blocking the event loop
        return await asyncio.to_thread(
            lambda: bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()
        )

    @staticmethod
    async def verify_password(plain: str, hashed: str) -> bool:
        # S8: same reason — bcrypt.checkpw is blocking
        return await asyncio.to_thread(
            lambda: bcrypt.checkpw(plain.encode(), hashed.encode())
        )

    # -----------------------------------------------------------------------
    # CREATE
    # -----------------------------------------------------------------------
    async def create(self, dto: UserCreateDTO) -> User:
        existing = await User.find_one(User.username == dto.username)
        if existing:
            raise UserAlreadyExistsError(
                f"Ya existe un usuario con username '{dto.username}'"
            )

        user = User(
            username=dto.username,
            password=await self._hash_password(dto.password),
            is_admin=dto.is_admin,
            hidden_columns=dto.hidden_columns,
        )
        await user.insert()
        return user

    # -----------------------------------------------------------------------
    # GET BY ID
    # -----------------------------------------------------------------------
    async def get_by_id(self, user_id: str) -> User:
        try:
            obj_id = PydanticObjectId(user_id)
        except Exception:
            raise UserNotFoundError(f"ID inválido: '{user_id}'")

        user = await User.get(obj_id)
        if not user:
            raise UserNotFoundError(f"Usuario con id '{user_id}' no encontrado")
        return user

    # -----------------------------------------------------------------------
    # GET BY USERNAME — usado por AuthController para login
    # -----------------------------------------------------------------------
    async def get_by_username(self, username: str) -> User | None:
        return await User.find_one(User.username == username)

    # -----------------------------------------------------------------------
    # GET ALL
    # -----------------------------------------------------------------------
    async def get_all(self) -> tuple[list[User], int]:
        users = await User.find_all().to_list()
        return users, len(users)

    # -----------------------------------------------------------------------
    # UPDATE (PATCH — solo campos enviados)
    # -----------------------------------------------------------------------
    async def update(self, user_id: str, dto: UserUpdateDTO) -> User:
        user = await self.get_by_id(user_id)

        update_data = dto.to_update_dict()
        if not update_data:
            return user

        # Si cambia username, verificar que no exista ya
        if "username" in update_data:
            existing = await User.find_one(User.username == update_data["username"])
            if existing and str(existing.id) != user_id:
                raise UserAlreadyExistsError(
                    f"Ya existe un usuario con username '{update_data['username']}'"
                )

        update_data["fecha_actualizacion"] = datetime.now(timezone.utc)
        await user.set(update_data)
        return user

    # -----------------------------------------------------------------------
    # DELETE
    # -----------------------------------------------------------------------
    async def delete(self, user_id: str) -> None:
        user = await self.get_by_id(user_id)
        await user.delete()