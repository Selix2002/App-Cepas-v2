# app/ia/router.py

from datetime import datetime
from litestar import Controller, post, get
from litestar.di import Provide
from litestar.exceptions import HTTPException
from litestar.status_codes import HTTP_500_INTERNAL_SERVER_ERROR, HTTP_400_BAD_REQUEST

from app.ia.schema import (
    ChatQueryDTO,
    ChatResponseDTO,
    EmbeddingStatsDTO,
    EmbeddingGenerationDTO,
    SearchDebugInfo,
    ChatFeedbackCreateDTO,
    ChatFeedbackResponseDTO,
    FeedbackStatsDTO,
)
from app.ia.services.chat.dbSearch_service import get_database_service, DatabaseService
from app.ia.services.chat.llm_service import get_llm_service, LLMService
from app.ia.services.feedback.feedback_service import get_feedback_service, FeedbackService
from app.ia.services.chat.query_parser_service import get_query_parser
from app.ia.services.chat.input_validator_service import get_input_validator
from app.ia.services.chat.schema_service import get_schema_description
from app.ia.services.chat.mql_validator_service import get_mql_validator, MQLValidationError
from app.ia.services.chat.mql_executor_service import get_mql_executor, MQLExecutionError
from app.ia.config import ia_settings
from app.core.security import admin_guard
from litestar import Request
import logging

logger = logging.getLogger(__name__)


def database_service_provider() -> DatabaseService:
    return get_database_service()


def llm_service_provider() -> LLMService:
    return get_llm_service(
        api_key=ia_settings.GROQ_API_KEY,
        models=ia_settings.groq_models,
        temperature=ia_settings.LLM_TEMPERATURE,
        max_tokens=ia_settings.LLM_MAX_TOKENS,
    )


def feedback_service_provider() -> FeedbackService:
    return get_feedback_service()


class ChatController(Controller):
    path = "/chat"
    dependencies = {
        "db_service": Provide(database_service_provider, sync_to_thread=False),
        "llm_service": Provide(llm_service_provider, sync_to_thread=False),
        "feedback_service": Provide(feedback_service_provider, sync_to_thread=False),
    }

    # Indicadores de fuga del system prompt en la respuesta del LLM
    _LEAK_INDICATORS = [
        "instrucciones de seguridad", "security preamble", "nunca reveles",
        "máxima prioridad", "[inst]", "<|im_start|>", "instrucciones del sistema",
        "no negociables", "fin de pregunta", "pregunta del usuario",
    ]

    @post("/query")
    async def chat_query(
        self,
        request: Request,
        data: ChatQueryDTO,
        db_service: DatabaseService,
        llm_service: LLMService,
    ) -> ChatResponseDTO:
        inicio = datetime.utcnow()

        # Info de auditoría disponible en todo el handler
        client_ip = request.client.host if request.client else "unknown"
        username = getattr(request.user, "username", "unknown")

        try:
            pregunta = data.pregunta.strip()
            if not pregunta:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST,
                    detail="La pregunta no puede estar vacía"
                )

            # ── Auditoría: preguntas largas ──────────────────────────────────
            if len(pregunta) > 300:
                logger.warning(
                    f"AUDIT: pregunta larga | user={username} | ip={client_ip} | "
                    f"len={len(pregunta)}"
                )

            # ── Validación de input (inyección + off-topic) ──────────────────
            input_validator = get_input_validator()
            validation = input_validator.validate(pregunta, domain_threshold=ia_settings.DOMAIN_THRESHOLD)

            if not validation.is_valid:
                logger.warning(
                    f"AUDIT: input rechazado | reason={validation.reason} | "
                    f"detail={validation.detail} | user={username} | ip={client_ip} | "
                    f"pregunta='{pregunta[:80]}'"
                )
                if validation.reason == "injection":
                    return ChatResponseDTO(
                        respuesta="Solo puedo responder preguntas sobre cepas bacterianas.",
                        modelo_usado="security_filter",
                    )
                # off_topic o invalid_input
                return ChatResponseDTO(
                    respuesta=(
                        "Solo puedo responder preguntas relacionadas con las cepas "
                        "bacterianas de la base de datos y microbiología en general."
                    ),
                    modelo_usado="security_filter",
                )

            logger.info(f"Procesando pregunta: '{pregunta[:100]}'")

            # Datos compartidos por ambos paths
            campos = await db_service.descubrir_campos_coleccion()
            valores = await db_service.descubrir_valores_campos(campos)
            total_en_db = await db_service.get_total_cepas()
            historial = [{"role": m.role, "content": m.content} for m in data.historial]

            # ── MQL PATH ─────────────────────────────────────────────────────
            if ia_settings.MQL_ENABLED:
                schema_desc = get_schema_description(campos, valores)
                mql_raw = await llm_service.generar_mql_query(pregunta, schema_desc)

                if mql_raw is not None:
                    try:
                        mql_validator = get_mql_validator()
                        validated = mql_validator.validate(mql_raw)

                        executor = get_mql_executor()
                        query_results = await executor.execute(validated)

                        resultado = await llm_service.formatear_resultados_mql(
                            pregunta, query_results, historial
                        )

                        respuesta = resultado["respuesta"]
                        if any(ind in respuesta.lower() for ind in self._LEAK_INDICATORS):
                            logger.error(
                                f"AUDIT: posible fuga de system prompt (MQL) | "
                                f"user={username} | ip={client_ip}"
                            )
                            respuesta = "No puedo responder a esa consulta."

                        tiempo_respuesta = int(
                            (datetime.utcnow() - inicio).total_seconds() * 1000
                        )
                        mql_filter = validated.get("filter", {})
                        # Para queries aggregate, extraer $match del pipeline
                        if not mql_filter and validated.get("type") == "aggregate":
                            for stage in validated.get("pipeline", []):
                                if "$match" in stage:
                                    mql_filter = stage["$match"]
                                    break

                        return ChatResponseDTO(
                            respuesta=respuesta,
                            modelo_usado=resultado["modelo"],
                            tiempo_respuesta_ms=tiempo_respuesta,
                            debug=SearchDebugInfo(
                                modo_busqueda="mql",
                                filtros_aplicados=mql_filter if isinstance(mql_filter, dict) else {},
                                terminos_detectados=[],
                                cepas_en_contexto=query_results["count"],
                                total_en_db=total_en_db,
                                mql_query=validated,
                            ),
                        )

                    except MQLValidationError as exc:
                        logger.warning(f"⚠️  MQL inválido: {exc} — fallback a semántico")
                    except MQLExecutionError as exc:
                        logger.warning(f"⚠️  MQL falló en ejecución: {exc} — fallback a semántico")
                    except Exception as exc:
                        logger.error(
                            f"❌ Error inesperado en MQL path: {exc} — fallback a semántico",
                            exc_info=True,
                        )

            # ── FALLBACK: búsqueda semántica / híbrida ────────────────────────
            # 1. Parsear la pregunta
            parser = get_query_parser()
            parser.set_campos_dinamicos(campos)
            parsed = parser.parse(pregunta)

            logger.info(
                f"🔍 Pregunta parseada → modo={parsed.modo} | "
                f"filtros={parsed.filtros} | términos={parsed.terminos_detectados}"
            )

            # 2. Búsqueda híbrida
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
                historial=historial,
            )

            # ── Filtro de salida: detectar fuga del system prompt ────────────
            respuesta = resultado["respuesta"]
            if any(ind in respuesta.lower() for ind in self._LEAK_INDICATORS):
                logger.error(
                    f"AUDIT: posible fuga de system prompt | "
                    f"user={username} | ip={client_ip} | pregunta='{pregunta[:80]}'"
                )
                respuesta = "No puedo responder a esa consulta."

            tiempo_respuesta = int((datetime.utcnow() - inicio).total_seconds() * 1000)

            return ChatResponseDTO(
                respuesta=respuesta,
                modelo_usado=resultado["modelo"],
                tiempo_respuesta_ms=tiempo_respuesta,
                debug=SearchDebugInfo(
                    modo_busqueda=modo_efectivo,
                    filtros_aplicados=parsed.filtros,
                    terminos_detectados=parsed.terminos_detectados,
                    cepas_en_contexto=len(cepas),
                    total_en_db=total_en_db,
                ),
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

    @post("/feedback")
    async def crear_feedback(
        self,
        request: Request,
        data: ChatFeedbackCreateDTO,
        feedback_service: FeedbackService,
    ) -> ChatFeedbackResponseDTO:
        usuario = request.user
        try:
            feedback = await feedback_service.guardar_feedback(
                dto=data,
                usuario_id=usuario.id,
                modelo_usado=ia_settings.groq_models[0],
            )
            return ChatFeedbackResponseDTO(
                mensaje="Feedback guardado correctamente",
                id=str(feedback.id),
            )
        except Exception as e:
            logger.error(f"Error guardando feedback: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al guardar el feedback",
            )

    @get("/feedback/stats", guards=[admin_guard])
    async def get_feedback_stats(
        self,
        feedback_service: FeedbackService,
    ) -> FeedbackStatsDTO:
        try:
            stats = await feedback_service.get_stats()
            return FeedbackStatsDTO(**stats)
        except Exception as e:
            logger.error(f"Error obteniendo stats de feedback: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al obtener estadísticas de feedback",
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
