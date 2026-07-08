# app/ia/services/chat/embedding_service.py
"""
Motor de embeddings intercambiable por `settings.EMBEDDING_PROVIDER`:

- "cohere": llamadas HTTP a Cohere API (httpx, sin numpy/torch) → corre en cualquier
  CPU. Es el parche para la VM de prod cuya CPU no soporta x86-64-v2/AVX.
- "local":  sentence-transformers local (requiere el extra `local-embeddings`).

La interfaz pública (`encode`, `encode_batch`, `cosine_similarity`,
`get_embedding_service`) se mantiene estable para no tocar los call sites. Los modelos
v3+ de Cohere exigen `input_type`: `search_document` para lo que se almacena (cepas) y
`search_query` para la pregunta del usuario.
"""

import logging
import math
from functools import lru_cache
from typing import List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Similitud coseno — Python puro (reemplaza numpy para correr sin AVX)
# ---------------------------------------------------------------------------

def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Similitud coseno entre dos vectores, sin numpy.

    Guarda de longitud: si las dimensiones no coinciden (p.ej. un embedding viejo de
    384 dims mezclado con uno nuevo de 1024 tras un cambio de provider) devuelve 0.0
    en vez de calcular basura sobre el zip truncado.
    """
    if len(vec1) != len(vec2):
        return 0.0

    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0

    return dot / (norm1 * norm2)


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------

class EmbeddingService:
    """Interfaz común de los proveedores de embeddings."""

    def encode(self, text: str, input_type: str = "search_query") -> List[float]:
        raise NotImplementedError

    def encode_batch(
        self, texts: List[str], input_type: str = "search_document"
    ) -> List[List[float]]:
        raise NotImplementedError

    # Delegación para los call sites que usan `service.cosine_similarity(...)`.
    cosine_similarity = staticmethod(cosine_similarity)


# ---------------------------------------------------------------------------
# Cohere (HTTP) — sin numpy/torch
# ---------------------------------------------------------------------------

class CohereEmbeddingService(EmbeddingService):
    """Embeddings vía Cohere API v2 (`POST /v2/embed`).

    - Batch máximo 96 textos por request (se parte en chunks).
    - Cliente httpx persistente → reusa la conexión TLS entre requests.
    - Caché LRU sobre `encode(text, input_type)` → si el mismo request pide el embedding
      de la pregunta dos veces (validador de dominio + búsqueda semántica) solo se gasta
      UNA llamada a Cohere (tope trial: 1000/mes).
    """

    _ENDPOINT = "https://api.cohere.com/v2/embed"
    _MAX_BATCH = 96
    _EMBEDDING_TYPES = ["float"]

    def __init__(self, api_key: str | None = None, model: str | None = None) -> None:
        api_key = api_key or settings.COHERE_API_KEY
        if not api_key:
            raise ValueError(
                "EMBEDDING_PROVIDER=cohere requiere COHERE_API_KEY en el .env"
            )
        self._model = model or settings.COHERE_EMBED_MODEL
        self._client = httpx.Client(
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        # Caché por-instancia de embeddings de una sola query (no de batches de import,
        # cuyos textos son únicos y no se repiten).
        self._encode_cached = lru_cache(maxsize=256)(self._encode_uncached)
        logger.info(f"🔧 Embeddings vía Cohere API (modelo: {self._model})")

    def _post_embed(self, texts: List[str], input_type: str) -> List[List[float]]:
        resp = self._client.post(
            self._ENDPOINT,
            json={
                "model": self._model,
                "input_type": input_type,
                "texts": texts,
                "embedding_types": self._EMBEDDING_TYPES,
            },
        )
        resp.raise_for_status()
        return resp.json()["embeddings"]["float"]

    def encode_batch(
        self, texts: List[str], input_type: str = "search_document"
    ) -> List[List[float]]:
        if not texts:
            return []

        logger.info(
            f"📝 Cohere embed: {len(texts)} textos (input_type={input_type})"
        )
        out: List[List[float]] = []
        for i in range(0, len(texts), self._MAX_BATCH):
            chunk = texts[i : i + self._MAX_BATCH]
            out.extend(self._post_embed(chunk, input_type))
        logger.info(f"✅ Cohere embed: {len(out)} embeddings recibidos")
        return out

    def _encode_uncached(self, text: str, input_type: str) -> List[float]:
        return self._post_embed([text], input_type)[0]

    def encode(self, text: str, input_type: str = "search_query") -> List[float]:
        if not text or not text.strip():
            raise ValueError("El texto no puede estar vacío")
        return self._encode_cached(text, input_type)


# ---------------------------------------------------------------------------
# Local (sentence-transformers) — requiere el extra `local-embeddings`
# ---------------------------------------------------------------------------

class LocalEmbeddingService(EmbeddingService):
    """Embeddings con sentence-transformers en proceso (motor original).

    `input_type` se ignora: MiniLM produce embeddings simétricos. Import de
    sentence-transformers es *lazy* (solo ocurre si se selecciona este provider) para
    que el resto del módulo IA no arrastre torch/numpy en CPUs que no los soportan.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        from sentence_transformers import SentenceTransformer  # lazy: torch/numpy

        logger.info(f"🔧 Inicializando modelo de embeddings local: {model_name}")
        self.model = SentenceTransformer(model_name)
        logger.info(
            f"✅ Modelo cargado. Dimensión: "
            f"{self.model.get_sentence_embedding_dimension()}"
        )

    def encode(self, text: str, input_type: str = "search_query") -> List[float]:
        if not text or not text.strip():
            raise ValueError("El texto no puede estar vacío")
        return self.model.encode(text, convert_to_tensor=False).tolist()

    def encode_batch(
        self, texts: List[str], input_type: str = "search_document"
    ) -> List[List[float]]:
        if not texts:
            return []
        logger.info(f"📝 Generando embeddings locales para {len(texts)} textos")
        return self.model.encode(texts, convert_to_tensor=False).tolist()


# ---------------------------------------------------------------------------
# Factory (singleton por provider)
# ---------------------------------------------------------------------------

@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Devuelve el proveedor según `settings.EMBEDDING_PROVIDER` (cacheado)."""
    provider = (settings.EMBEDDING_PROVIDER or "local").strip().lower()
    if provider == "cohere":
        return CohereEmbeddingService()
    if provider == "local":
        return LocalEmbeddingService()
    raise ValueError(
        f"EMBEDDING_PROVIDER inválido: '{provider}' (usar 'cohere' o 'local')"
    )
