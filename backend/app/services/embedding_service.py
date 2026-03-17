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
        logger.info(f"🔧 Inicializando modelo de embeddings: {model_name}")
        self.model = SentenceTransformer(model_name)
        logger.info(f"✅ Modelo cargado. Dimensión de embedding: {self.model.get_sentence_embedding_dimension()}")
    
    def encode(self, text: str) -> List[float]:
        """Genera embedding para un texto"""
        if not text or not text.strip():
            raise ValueError("El texto no puede estar vacío")
        
        logger.debug(f"📝 Generando embedding para texto de {len(text)} caracteres")
        logger.debug(f"   Texto (primeros 100 chars): {text[:100]}...")
        
        embedding = self.model.encode(text, convert_to_tensor=False)
        
        logger.debug(f"✅ Embedding generado: {len(embedding)} dimensiones")
        logger.debug(f"   Rango de valores: [{embedding.min():.4f}, {embedding.max():.4f}]")
        
        return embedding.tolist()
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Genera embeddings para múltiples textos"""
        if not texts:
            return []
        
        logger.info(f"📝 Generando embeddings para {len(texts)} textos en batch")
        
        embeddings = self.model.encode(texts, convert_to_tensor=False)
        
        logger.info(f"✅ Batch completado: {len(embeddings)} embeddings generados")
        
        return embeddings.tolist()
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calcula similitud coseno entre dos vectores"""
        vec1_np = np.array(vec1)
        vec2_np = np.array(vec2)
        
        norm_product = np.linalg.norm(vec1_np) * np.linalg.norm(vec2_np)
        if norm_product == 0:
            return 0.0
        
        similarity = float(np.dot(vec1_np, vec2_np) / norm_product)
        
        logger.debug(f"📊 Similitud calculada: {similarity:.4f}")
        
        return similarity

# Singleton global
_embedding_service_instance = None

@lru_cache()
def get_embedding_service(model_name: str = "all-MiniLM-L6-v2") -> EmbeddingService:
    """Retorna instancia única del servicio de embeddings"""
    global _embedding_service_instance
    if _embedding_service_instance is None:
        _embedding_service_instance = EmbeddingService(model_name)
    return _embedding_service_instance