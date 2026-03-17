# config.py
from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    debug: bool = True
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "cepas_db"
    secret_key: SecretStr = SecretStr("secret123")
    
    # Groq API
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.1-8b-instant"
    
    # Configuración de embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    MAX_CONTEXT_CEPAS: int = 30
    SIMILARITY_THRESHOLD: float = 0.3
    
    # Configuración LLM
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 500
    
    # Configuración de logging (DEBUG/INFO/ERROR)
    LOG_LEVEL: str = "DEBUG"
    
    class Config:
        env_file = ".env"

settings = Settings()
