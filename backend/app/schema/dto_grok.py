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
    max_resultados: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Número máximo de cepas a usar como contexto"
    )

class CepaFuenteDTO(BaseModel):
    """DTO para cepa usada como fuente"""
    id: str
    cepa: str
    genero: Optional[str] = None
    especie: Optional[str] = None
    codigo_cepa: Optional[str] = None

class ChatResponseDTO(BaseModel):
    """DTO para respuesta del chat"""
    respuesta: str = Field(..., description="Respuesta generada por la IA")
    fuentes: Optional[List[CepaFuenteDTO]] = Field(
        default=None,
        description="Cepas usadas como contexto"
    )
    modelo_usado: str = Field(..., description="Modelo LLM utilizado")
    tokens_usados: Optional[int] = Field(
        default=None,
        description="Tokens consumidos en la generación"
    )
    tiempo_respuesta_ms: Optional[int] = Field(
        default=None,
        description="Tiempo de respuesta en milisegundos"
    )

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