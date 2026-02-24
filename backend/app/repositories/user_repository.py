from datetime import datetime

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
    def _hash_password(plain: str) -> str:
        return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode(), hashed.encode())

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
            password=self._hash_password(dto.password),
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

        update_data["fecha_actualizacion"] = datetime.utcnow()
        await user.set(update_data)
        return user

    # -----------------------------------------------------------------------
    # DELETE
    # -----------------------------------------------------------------------
    async def delete(self, user_id: str) -> None:
        user = await self.get_by_id(user_id)
        await user.delete()