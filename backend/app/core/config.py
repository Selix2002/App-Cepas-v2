# app/core/config.py

from pydantic_settings import BaseSettings
from pydantic import SecretStr


class Settings(BaseSettings):
    debug: bool = True
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "cepas_db"
    secret_key: SecretStr = SecretStr("secret123")

    # Módulo de IA — poner IA_ENABLED=false en .env para desactivarlo
    IA_ENABLED: bool = True

    # Logging
    LOG_LEVEL: str = "DEBUG"

    class Config:
        env_file = ".env",
        extra = "ignore"


settings = Settings()
