# app/services/feedback_service.py

from beanie import PydanticObjectId

from app.models.models import ChatFeedback
from app.repositories.feedback_repository import FeedbackRepository
from app.schema.dto_grok import ChatFeedbackCreateDTO
import logging

logger = logging.getLogger(__name__)


class FeedbackService:

    def __init__(self):
        self.repo = FeedbackRepository()

    async def guardar_feedback(
        self,
        dto: ChatFeedbackCreateDTO,
        usuario_id: PydanticObjectId,
        modelo_usado: str,
    ) -> ChatFeedback:
        feedback = await self.repo.crear(
            usuario_id=usuario_id,
            pregunta=dto.pregunta,
            respuesta=dto.respuesta,
            calificacion=dto.calificacion,
            comentario=dto.comentario,
            modelo_usado=modelo_usado,
            modo_busqueda=dto.modo_busqueda,
        )

        eliminados = await self.repo.limpiar_antiguos()
        if eliminados:
            logger.info(f"🗑️  Post-insert TTL: {eliminados} feedbacks eliminados")

        return feedback

    async def get_stats(self) -> dict:
        return await self.repo.get_stats()


def get_feedback_service() -> FeedbackService:
    return FeedbackService()
