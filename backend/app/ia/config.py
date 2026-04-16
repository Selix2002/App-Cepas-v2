# app/ia/config.py

from pydantic_settings import BaseSettings


class IaSettings(BaseSettings):
    # LLM / OpenRouter
    OPENROUTER_API_KEY: str
    OPENROUTER_MODEL: str = "openrouter/auto"

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    MAX_CONTEXT_CEPAS: int = 30
    SIMILARITY_THRESHOLD: float = 0.3       # fallback si hay < 3 scores
    THRESHOLD_STD_FACTOR: float = 0.5       # threshold = mediana + factor * MAD
    THRESHOLD_MIN_FLOOR: float = 0.15       # piso absoluto anti off-domain

    # Seguridad
    DOMAIN_THRESHOLD: float = 0.20          # similitud mínima con anclas del dominio

    # Rate limiting del chat
    CHAT_RATE_LIMIT_REQUESTS: int = 10
    CHAT_RATE_LIMIT_SECONDS: int = 60

    # LLM
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 2000

    # MQL (Text-to-MongoDB)
    MQL_ENABLED: bool = True
    MQL_MAX_RESULTS: int = 100

    class Config:
        env_file = ".env"
        extra = "ignore"


ia_settings = IaSettings()
