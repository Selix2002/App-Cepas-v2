# app/services/embeddings_service.py

from sentence_transformers import SentenceTransformer
from functools import lru_cache
import numpy as np
from typing import List
import logging

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Servicio para generar y comparar embeddings de texto"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        logger.info(f"Inicializando modelo de embeddings: {model_name}")
        self.model = SentenceTransformer(model_name)
        logger.info("Modelo de embeddings cargado exitosamente")
    
    def encode(self, text: str) -> List[float]:
        """Genera embedding para un texto"""
        if not text or not text.strip():
            raise ValueError("El texto no puede estar vacío")
        
        embedding = self.model.encode(text, convert_to_tensor=False)
        return embedding.tolist()
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Genera embeddings para múltiples textos"""
        if not texts:
            return []
        
        embeddings = self.model.encode(texts, convert_to_tensor=False)
        return embeddings.tolist()
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calcula similitud coseno entre dos vectores"""
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        norm_product = np.linalg.norm(vec1_np) * np.linalg.norm(vec2_np)
        if norm_product == 0:
            return 0.0
        
        return float(np.dot(vec1_np, vec2_np) / norm_product)

# Singleton global
_embedding_service_instance = None

@lru_cache()
def get_embedding_service(model_name: str = "all-MiniLM-L6-v2") -> EmbeddingService:
    """Retorna instancia única del servicio de embeddings"""
    global _embedding_service_instance
    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService(model_name)
    return _embedding_service_instance