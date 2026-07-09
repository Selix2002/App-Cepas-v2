# app/core/config.py

from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import SecretStr

_ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class Settings(BaseSettings):
    debug: bool = False  # S4: never expose stack traces in production
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "cepas_db"
    secret_key: SecretStr  # S2: required — set SECRET_KEY in .env
    redis_url: str = "redis://localhost:6379/0"  # set REDIS_URL in .env for hosted Redis

    # CORS — set ALLOWED_ORIGINS in .env as JSON array
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Módulo de IA — poner IA_ENABLED=false en .env para desactivarlo
    IA_ENABLED: bool = True

    # Motor de embeddings — intercambiable por env (parche CPU-sin-AVX de la VM de prod).
    # "cohere": llamadas HTTP a Cohere API (sin numpy/torch → corre en cualquier CPU).
    # "local":  sentence-transformers local (requiere el extra `local-embeddings`).
    # Va aquí y no en ia/config.py porque el import/create de cepas lo usa y no debe
    # depender de GROQ_API_KEY (que IaSettings exige).
    EMBEDDING_PROVIDER: str = "local"
    COHERE_API_KEY: str | None = None
    COHERE_EMBED_MODEL: str = "embed-multilingual-v3.0"  # 1024 dims, multilingüe

    # Refresh diferido de embeddings (scripts/check_embeddings_refresh.py, vía systemd timer):
    # se dispara un batch cuando la cepa stale más antigua supera EMBEDDING_STALE_DAYS días,
    # o cuando se acumulan EMBEDDING_STALE_EDIT_THRESHOLD ediciones sin refrescar.
    EMBEDDING_STALE_DAYS: int = 5
    EMBEDDING_STALE_EDIT_THRESHOLD: int = 90

    # Logging — L7: INFO por defecto (DEBUG vuelca payloads sensibles a stdout en prod).
    # El contenido sensible (preguntas, MQL, resultados de Mongo, respuestas del LLM) está
    # en DEBUG; INFO conserva solo telemetría operativa (counts, tokens, modos).
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = str(_ENV_FILE)
        extra = "ignore"


settings = Settings()
