from pydantic import BaseModel, SecretStr, field_validator


class LoginDTO(BaseModel):
    username: str
    # S22: SecretStr enmascara la contraseña en repr()/logs/dumps de Litestar.
    # Se desenvuelve con .get_secret_value() solo en el call site de autenticación.
    password: SecretStr

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El campo no puede estar vacío")
        return v

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: SecretStr) -> SecretStr:
        if not v.get_secret_value().strip():
            raise ValueError("El campo no puede estar vacío")
        return v