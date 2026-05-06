# app/core/config.py

from pydantic_settings import BaseSettings
from pydantic import SecretStr


class Settings(BaseSettings):
    debug: bool = False  # S4: never expose stack traces in production
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "cepas_db"
    secret_key: SecretStr  # S2: required — set SECRET_KEY in .env

    # CORS — set ALLOWED_ORIGINS in .env as JSON array
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Módulo de IA — poner IA_ENABLED=false en .env para desactivarlo
    IA_ENABLED: bool = True

    # Logging
    LOG_LEVEL: str = "DEBUG"

    class Config:
        env_file = ".env",
        extra = "ignore"


settings = Settings()
