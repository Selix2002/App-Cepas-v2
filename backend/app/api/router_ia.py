# app/controllers/chat_controller.py o app/api/router_ia.py

from datetime import datetime
from litestar import Controller, post, get
from litestar.di import Provide
from litestar.exceptions import HTTPException
from litestar.status_codes import HTTP_500_INTERNAL_SERVER_ERROR, HTTP_400_BAD_REQUEST

from app.schema.dto_grok import (
    ChatQueryDTO,
    ChatResponseDTO,
    EmbeddingStatsDTO,
    EmbeddingGenerationDTO,
)
from app.services.dbSearch_service import get_database_service, DatabaseService
from app.services.llm_service import get_llm_service, LLMService
from app.services.query_parser_service import get_query_parser
from app.core.config import settings
from app.core.security import admin_guard
import logging

logger = logging.getLogger(__name__)


def database_service_provider() -> DatabaseService:
    return get_database_service()


def llm_service_provider() -> LLMService:
    return get_llm_service(
        api_key=settings.GROQ_API_KEY,
        model=settings.GROQ_MODEL,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
    )


class ChatController(Controller):
    path = "/chat"
    dependencies = {
        "db_service": Provide(database_service_provider, sync_to_thread=False),
        "llm_service": Provide(llm_service_provider, sync_to_thread=False),
    }

    @post("/query")
    async def chat_query(
        self,
        data: ChatQueryDTO,
        db_service: DatabaseService,
        llm_service: LLMService,
    ) -> ChatResponseDTO:
        inicio = datetime.utcnow()
        try:
            pregunta = data.pregunta.strip()
            if not pregunta:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST,
                    detail="La pregunta no puede estar vacía"
                )

            logger.info(f"Procesando pregunta: '{pregunta[:100]}'")

            # 1. Parsear la pregunta
            parser = get_query_parser()
            campos = await db_service.descubrir_campos_coleccion()
            parser.set_campos_dinamicos(campos)
            parsed = parser.parse(pregunta)

            logger.info(
                f"🔍 Pregunta parseada → modo={parsed.modo} | "
                f"filtros={parsed.filtros} | términos={parsed.terminos_detectados}"
            )

            # 2. Búsqueda híbrida
            total_en_db = await db_service.get_total_cepas()
            cepas, modo_efectivo = await db_service.busqueda_hibrida(pregunta, parsed)

            logger.info(
                f"📦 Contexto para LLM: {len(cepas)} cepas | modo_efectivo={modo_efectivo}"
            )

            # 3. Generar respuesta con contexto filtrado
            resultado = await llm_service.generar_respuesta(
                pregunta,
                cepas=cepas,
                modo=modo_efectivo,
                total_en_db=total_en_db,
            )

            tiempo_respuesta = int((datetime.utcnow() - inicio).total_seconds() * 1000)

            return ChatResponseDTO(
                respuesta=resultado["respuesta"],
                modelo_usado=resultado["modelo"],
                tokens_usados=resultado.get("tokens_usados"),
                tiempo_respuesta_ms=tiempo_respuesta,
            )

        except ValueError as e:
            raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            logger.error(f"Error en chat_query: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al procesar la consulta. Por favor intenta de nuevo."
            )
    

    @get("/embeddings/stats")
    async def get_embedding_stats(
        self,
        db_service: DatabaseService,
    ) -> EmbeddingStatsDTO:
        try:
            stats = await db_service.get_embedding_stats()
            return EmbeddingStatsDTO(**stats)
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {str(e)}")
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al obtener estadísticas"
            )

    @post("/embeddings/generate", guards=[admin_guard])
    async def generate_embeddings(
        self,
        db_service: DatabaseService,
    ) -> EmbeddingGenerationDTO:
        try:
            logger.info("Iniciando generación de embeddings")
            stats_antes = await db_service.get_embedding_stats()
            cepas_procesadas, tiempo_total = await db_service.generar_embeddings_batch()
            stats_despues = await db_service.get_embedding_stats()
            
            return EmbeddingGenerationDTO(
                mensaje=f"Embeddings generados exitosamente para {cepas_procesadas} cepas\n stats antes: {stats_antes}\n stats después: {stats_despues}",
                cepas_procesadas=cepas_procesadas,
                tiempo_total_segundos=round(tiempo_total, 2),
                estadisticas=EmbeddingStatsDTO(**stats_despues)
            )
        except Exception as e:
            logger.error(f"Error generando embeddings: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al generar embeddings: {str(e)}"
            )