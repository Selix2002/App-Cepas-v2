from pydantic import BaseModel, field_validator
from datetime import datetime


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------
class UserCreateDTO(BaseModel):
    username: str
    password: str
    is_admin: bool = False
    hidden_columns: list[str] = []

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El username no puede estar vacío")
        if len(v) < 3:
            raise ValueError("El username debe tener al menos 3 caracteres")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


# ---------------------------------------------------------------------------
# UPDATE — solo username e is_admin (PATCH semántico)
# ---------------------------------------------------------------------------
class UserUpdateDTO(BaseModel):
    username: str | None = None
    is_admin: bool | None = None

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("El username no puede estar vacío")
            if len(v) < 3:
                raise ValueError("El username debe tener al menos 3 caracteres")
        return v

    def to_update_dict(self) -> dict:
        """Retorna solo los campos explícitamente enviados (excluye los None)."""
        return self.model_dump(exclude_none=True)


# ---------------------------------------------------------------------------
# RESPONSE — nunca expone la password
# ---------------------------------------------------------------------------
class UserResponseDTO(BaseModel):
    id: str
    username: str
    is_admin: bool
    hidden_columns: list[str]
    fecha_creacion: datetime
    fecha_actualizacion: datetime | None = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# RESPONSE lista
# ---------------------------------------------------------------------------
class UserListDTO(BaseModel):
    total: int
    items: list[UserResponseDTO]