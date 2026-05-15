# app/ia/schema.py

from pydantic import BaseModel, Field
from typing import Optional, List


class HistorialMensaje(BaseModel):
    """Un turno del historial de conversación"""
    role: str = Field(..., description="'user' o 'assistant'")
    content: str = Field(..., description="Contenido del mensaje")


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
    historial: List[HistorialMensaje] = Field(
        default_factory=list,
        description="Últimos turnos de la conversación (máx 6 mensajes = 3 pares)"
    )


class SearchDebugInfo(BaseModel):
    """Metadatos del proceso de búsqueda, útiles para debugging y testing"""
    modo_busqueda: str
    filtros_aplicados: dict
    terminos_detectados: List[str]
    cepas_en_contexto: int
    total_en_db: int
    mql_query: Optional[dict] = None


class ChatResponseDTO(BaseModel):
    """DTO para respuesta del chat"""
    respuesta: str = Field(..., description="Respuesta generada por la IA")
    modelo_usado: str = Field(..., description="Modelo LLM utilizado")
    tiempo_respuesta_ms: Optional[int] = Field(default=None, description="Tiempo de respuesta en ms")
    debug: Optional[SearchDebugInfo] = Field(default=None, description="Info del proceso de búsqueda")


class ChatFeedbackCreateDTO(BaseModel):
    """DTO para recibir feedback del usuario sobre una respuesta del chat"""
    pregunta: str = Field(..., min_length=1, max_length=500)
    respuesta: str = Field(..., min_length=1)
    calificacion: int = Field(..., ge=1, le=5, description="Calificación del 1 al 5")
    comentario: Optional[str] = Field(default=None, max_length=1000)
    modo_busqueda: Optional[str] = None
    mql_query: Optional[dict] = None


class ChatFeedbackResponseDTO(BaseModel):
    """DTO de confirmación tras guardar el feedback"""
    mensaje: str
    id: str


class FeedbackStatsDTO(BaseModel):
    """DTO para estadísticas de feedback"""
    total: int
    promedio_calificacion: float
    distribucion: dict[str, int]          # {"1": n, "2": n, ...}
    total_con_comentario: int


class FeedbackListItemDTO(BaseModel):
    """Un registro de feedback para la lista paginada"""
    id: str
    pregunta: str
    respuesta: str
    calificacion: int
    comentario: Optional[str] = None
    fecha: str                            # ISO 8601
    modelo_usado: str
    modo_busqueda: Optional[str] = None
    mql_query: Optional[dict] = None


class FeedbackListResponseDTO(BaseModel):
    """Respuesta paginada de feedback"""
    items: List[FeedbackListItemDTO]
    total: int
    page: int
    page_size: int
    total_pages: int


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
