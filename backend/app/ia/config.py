# app/ia/config.py

from pathlib import Path
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resuelve backend/.env sin importar desde dónde se ejecute el proceso
_ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class IaSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        extra="ignore",
    )

    # LLM
    GROQ_API_KEY: str
    GROQ_MODELS: str  # comma-separated in .env; parsed to list below
    _groq_models_list: list[str] = []

    @model_validator(mode="after")
    def _parse_models(self) -> "IaSettings":
        self._groq_models_list = [m.strip() for m in self.GROQ_MODELS.split(",") if m.strip()]
        return self

    @property
    def groq_models(self) -> list[str]:
        return self._groq_models_list

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



ia_settings = IaSettings()
