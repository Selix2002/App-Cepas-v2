# config.py
from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    debug: bool = True
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "cepas_db"
    secret_key: SecretStr = SecretStr("secret123")
    
    # Groq API
    OPENROUTER_API_KEY: str
    OPENROUTER_MODEL: str = "openrouter/auto"
    
    # Configuración de embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    MAX_CONTEXT_CEPAS: int = 30
    SIMILARITY_THRESHOLD: float = 0.3  # usado solo como fallback si hay < 3 scores

    # Umbral dinámico: threshold = median + THRESHOLD_STD_FACTOR * MAD
    THRESHOLD_STD_FACTOR: float = 0.5   # ajustar según pruebas
    THRESHOLD_MIN_FLOOR: float = 0.15   # piso absoluto (mitiga riesgo off-domain)

    # Seguridad IA
    DOMAIN_THRESHOLD: float = 0.20      # similitud mínima con anclas del dominio
    CHAT_RATE_LIMIT_REQUESTS: int = 10  # máx requests por ventana
    CHAT_RATE_LIMIT_SECONDS: int = 60   # tamaño de la ventana en segundos
    
    # Configuración LLM
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 2000 
    
    # Configuración de logging (DEBUG/INFO/ERROR)
    LOG_LEVEL: str = "DEBUG"
    
    class Config:
        env_file = ".env",
        extra="ignore"

settings = Settings()
