# app/schema/chat_dtos.py

from pydantic import BaseModel, Field
from typing import Optional, List

class ChatQueryDTO(BaseModel):
    """DTO para consulta del chat"""
    pregunta: str = Field(
        ..., 
        min_length=3, 
        max_length=500,
        description="Pregunta sobre las cepas bacterianas"
    )
    incluir_fuentes: bool = Field(
        default=True,
        description="Si se deben incluir las cepas usadas como contexto"
    )




class SearchDebugInfo(BaseModel):
    """Metadatos del proceso de búsqueda, útiles para debugging y testing"""
    modo_busqueda: str
    filtros_aplicados: dict
    terminos_detectados: List[str]
    cepas_en_contexto: int
    total_en_db: int


class ChatResponseDTO(BaseModel):
    """DTO para respuesta del chat"""
    respuesta: str = Field(..., description="Respuesta generada por la IA")
    modelo_usado: str = Field(..., description="Modelo LLM utilizado")
    tokens_enviados: Optional[int] = Field(default=None, description="Tokens del prompt (entrada)")
    tokens_recibidos: Optional[int] = Field(default=None, description="Tokens de la respuesta (salida)")
    tokens_usados: Optional[int] = Field(default=None, description="Tokens totales")
    tiempo_respuesta_ms: Optional[int] = Field(default=None, description="Tiempo de respuesta en ms")
    debug: Optional[SearchDebugInfo] = Field(default=None, description="Info del proceso de búsqueda")

class EmbeddingStatsDTO(BaseModel):
    """DTO para estadísticas de embeddings"""
    total_cepas: int
    cepas_con_embedding: int
    cepas_sin_embedding: int
    porcentaje_completado: float

class EmbeddingGenerationDTO(BaseModel):
    """DTO para resultado de generación de embeddings"""
    mensaje: str
    cepas_procesadas: int
    tiempo_total_segundos: float
    estadisticas: EmbeddingStatsDTO