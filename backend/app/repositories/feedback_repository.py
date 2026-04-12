# app/repositories/feedback_repository.py

from datetime import datetime, timedelta
from beanie import PydanticObjectId

from app.models.models import ChatFeedback
import logging

logger = logging.getLogger(__name__)

_TTL_YEARS = 1
_TTL_THRESHOLD = 100


class FeedbackRepository:

    async def crear(
        self,
        usuario_id: PydanticObjectId,
        pregunta: str,
        respuesta: str,
        calificacion: int,
        modelo_usado: str,
        comentario: str | None = None,
        modo_busqueda: str | None = None,
    ) -> ChatFeedback:
        feedback = ChatFeedback(
            usuario_id=usuario_id,
            pregunta=pregunta,
            respuesta=respuesta,
            calificacion=calificacion,
            comentario=comentario,
            modelo_usado=modelo_usado,
            modo_busqueda=modo_busqueda,
        )
        await feedback.insert()
        logger.info(f"✅ Feedback guardado | id={feedback.id} | calificacion={calificacion}")
        return feedback

    async def limpiar_antiguos(self) -> int:
        """
        Borra feedbacks con más de 1 año de antigüedad,
        pero solo si el total supera los 100 registros.
        Retorna la cantidad de documentos eliminados.
        """
        total = await ChatFeedback.count()
        if total <= _TTL_THRESHOLD:
            logger.debug(
                f"🗑️  Limpieza omitida: total={total} (≤ {_TTL_THRESHOLD})"
            )
            return 0

        corte = datetime.utcnow() - timedelta(days=365 * _TTL_YEARS)
        resultado = await ChatFeedback.find(
            ChatFeedback.fecha < corte
        ).delete()

        eliminados = resultado.deleted_count if resultado else 0
        if eliminados:
            logger.info(
                f"🗑️  Limpieza TTL: eliminados {eliminados} feedbacks "
                f"(total previo={total}, corte={corte.date()})"
            )
        return eliminados

    async def get_stats(self) -> dict:
        total = await ChatFeedback.count()
        if total == 0:
            return {
                "total": 0,
                "promedio_calificacion": 0.0,
                "distribucion": {str(i): 0 for i in range(1, 6)},
                "total_con_comentario": 0,
            }

        todos = await ChatFeedback.find_all().to_list()

        suma = sum(f.calificacion for f in todos)
        promedio = round(suma / total, 2)

        distribucion = {str(i): 0 for i in range(1, 6)}
        for f in todos:
            distribucion[str(f.calificacion)] += 1

        con_comentario = sum(1 for f in todos if f.comentario)

        return {
            "total": total,
            "promedio_calificacion": promedio,
            "distribucion": distribucion,
            "total_con_comentario": con_comentario,
        }
