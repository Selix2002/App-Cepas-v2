# app/ia/models.py

from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from typing import Optional, List
from datetime import datetime


class ChatFeedback(Document):
    usuario_id: PydanticObjectId
    pregunta: str
    respuesta: str
    calificacion: int                        # 1–5
    comentario: Optional[str] = None
    fecha: datetime = Field(default_factory=datetime.utcnow)
    modelo_usado: str
    modo_busqueda: Optional[str] = None

    class Settings:
        name = "chat_feedback"


class ChatMessage(BaseModel):
    pregunta: str = Field(..., min_length=3, max_length=500)
    incluir_fuentes: bool = True


class ChatResponse(BaseModel):
    respuesta: str
    fuentes: Optional[List[dict]] = None
    modelo_usado: str
    tokens_usados: Optional[int] = None
