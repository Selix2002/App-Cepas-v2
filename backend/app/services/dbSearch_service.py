# app/services/database_service.py

import time
import statistics
from app.models.models import Cepa
from app.services.embedding_service import get_embedding_service
from typing import TYPE_CHECKING, List, Tuple
import logging
from datetime import datetime

if TYPE_CHECKING:
    from app.services.query_parser_service import ParsedQuery

logger = logging.getLogger(__name__)

class DatabaseService:
    """Servicio para búsqueda semántica e híbrida de cepas"""

    # Caché de campos de colección compartida entre instancias (TTL: 5 min)
    _campos_cache: list[str] = []
    _campos_cache_time: float = 0.0
    _CAMPOS_CACHE_TTL: float = 300.0

    def __init__(self):
        self.embedding_service = get_embedding_service()
    
    async def get_todas_las_cepas(self) -> List[Cepa]:
        """Obtiene TODAS las cepas de la base de datos"""
        logger.info("🔍 Obteniendo todas las cepas de la base de datos...")
        todas = await Cepa.find_all().to_list()
        logger.info(f"✅ Obtenidas {len(todas)} cepas")
        
        # Log de muestra
        if todas:
            logger.debug("📋 Muestra de cepas:")
            for i, cepa in enumerate(todas[:3], 1):
                logger.debug(f"   {i}. {cepa.cepa} (ID: {cepa.id})")
        
        return todas
    
    async def buscar_cepas_similares(
        self, 
        pregunta: str, 
        limit: int = 5,
        threshold: float = 0.3
    ) -> List[Cepa]:
        """Busca cepas similares usando embeddings"""
        logger.info(f"🔍 Buscando cepas similares a: '{pregunta[:50]}...'")
        logger.info(f"   Parámetros: limit={limit}, threshold={threshold}")
        
        try:
            # Generar embedding de la pregunta
            logger.debug("📝 Generando embedding de la pregunta...")
            query_embedding = self.embedding_service.encode(pregunta)
            logger.debug(f"✅ Embedding generado: {len(query_embedding)} dimensiones")
            
            # Buscar cepas con embeddings
            cepas_con_embedding = await Cepa.find(
                {"embedding": {"$exists": True}}
            ).to_list()
            
            logger.info(f"📊 Cepas con embedding en DB: {len(cepas_con_embedding)}")
            
            if cepas_con_embedding:
                logger.info("🎯 Usando búsqueda vectorial")
                return await self._busqueda_vectorial(
                    query_embedding, 
                    cepas_con_embedding, 
                    limit, 
                    threshold
                )
            else:
                logger.warning("⚠️  No hay embeddings disponibles, usando búsqueda de texto")
                return await self._busqueda_vectorial(pregunta, limit)
        
        except Exception as e:
            logger.error(f"❌ Error en búsqueda: {str(e)}", exc_info=True)
            return await self._busqueda_vectorial(pregunta, limit)
    
    async def _busqueda_vectorial(
        self,
        query_embedding: List[float],
        cepas: List[Cepa],
        limit: int,
        threshold: float
    ) -> List[Cepa]:
        """Búsqueda por similitud de embeddings"""
        logger.debug(f"🔬 Calculando similitudes con {len(cepas)} cepas...")
        
        resultados = []
        excluidas = []

        for cepa in cepas:
            if not cepa.embedding:
                excluidas.append((cepa.cepa, None, "sin_embedding"))
                continue

            similitud = self.embedding_service.cosine_similarity(
                query_embedding,
                cepa.embedding
            )

            if similitud >= threshold:
                resultados.append((cepa, similitud))
                logger.debug(f"   ✓ {cepa.cepa}: similitud={similitud:.4f}")
            else:
                excluidas.append((cepa.cepa, similitud, "bajo_threshold"))

        # Ordenar por similitud descendente
        resultados.sort(key=lambda x: x[1], reverse=True)

        logger.info(f"✅ Incluidas: {len(resultados)} cepas (similitud >= {threshold})")

        if excluidas:
            logger.debug(f"🚫 Excluidas del contexto ({len(excluidas)} cepas):")
            for nombre, sim, motivo in sorted(excluidas, key=lambda x: x[1] if x[1] is not None else -1):
                sim_str = f"{sim:.4f}" if sim is not None else "N/A"
                logger.debug(f"   ✗ {nombre}: similitud={sim_str} motivo={motivo}")

        if resultados:
            logger.info("🏆 Top 3 más similares:")
            for i, (cepa, sim) in enumerate(resultados[:3], 1):
                logger.info(f"   {i}. {cepa.cepa} - similitud: {sim:.4f}")

        return [cepa for cepa, _ in resultados[:limit]]
    
    @staticmethod
    def _cepa_a_texto(cepa: Cepa) -> str:
        """Convierte una cepa a texto representativo para embedding"""
        partes = []
        
        # Campos fijos principales
        if cepa.cepa:
            partes.append(f"Cepa {cepa.cepa}")
        if cepa.codigo_lab:
            partes.append(f"Código {cepa.codigo_lab}")
        if cepa.origen:
            partes.append(f"Origen {cepa.origen}")
        
        # ... resto del código ...
        
        texto_final = " ".join(partes)
        
        logger.debug(f"📄 Texto generado para '{cepa.cepa}':")
        logger.debug(f"   Longitud: {len(texto_final)} caracteres")
        logger.debug(f"   Contenido: {texto_final[:150]}...")
        
        return texto_final
    async def get_total_cepas(self) -> int:
        return await Cepa.count()

    async def descubrir_campos_coleccion(self) -> list[str]:
        """Obtiene todos los field names que existen en la colección, con caché de 5 min."""
        ahora = time.time()
        if ahora - DatabaseService._campos_cache_time < DatabaseService._CAMPOS_CACHE_TTL:
            logger.debug(
                f"📋 Usando caché de campos ({len(DatabaseService._campos_cache)} campos)"
            )
            return DatabaseService._campos_cache

        logger.debug("📋 Descubriendo campos de la colección cepas...")
        pipeline = [
            {"$project": {"fields": {"$objectToArray": "$$ROOT"}}},
            {"$unwind": "$fields"},
            {"$group": {"_id": None, "keys": {"$addToSet": "$fields.k"}}},
        ]
        cursor = Cepa.get_pymongo_collection().aggregate(pipeline)
        result = await cursor.to_list(length=None)
        campos = sorted(result[0]["keys"]) if result else []

        DatabaseService._campos_cache = campos
        DatabaseService._campos_cache_time = ahora

        logger.debug(f"   Campos descubiertos: {campos}")
        return campos

    async def busqueda_hibrida(
        self,
        pregunta: str,
        parsed: "ParsedQuery",
    ) -> tuple[list[Cepa], str]:
        """
        Búsqueda en tres modos:
        - estadístico: filtro MongoDB exacto, sin vector (conteos precisos)
        - híbrido:     filtro MongoDB → similitud vectorial sobre el subconjunto
        - semántico:   similitud vectorial sobre toda la DB (sin filtros)
        Retorna (cepas, modo_efectivo).
        """
        total_db = await self.get_total_cepas()

        logger.info("━" * 60)
        logger.info("🔀 BÚSQUEDA HÍBRIDA")
        logger.info(f"   Pregunta:   '{pregunta[:80]}'")
        logger.info(f"   Modo:       {parsed.modo}")
        logger.info(f"   Filtros:    {parsed.filtros}")
        logger.info(f"   Términos:   {parsed.terminos_detectados}")
        logger.info(f"   Total DB:   {total_db} cepas")
        logger.info("━" * 60)

        # ── Sin filtros ────────────────────────────────────────────────
        if not parsed.filtros:
            if parsed.es_estadistico:
                logger.info("📊 Sin filtros + estadístico → todas las cepas")
                cepas = await self.get_todas_las_cepas()
                logger.info(f"   ✅ Retornando {len(cepas)} cepas (estadístico global)")
                return cepas, "estadístico"
            else:
                logger.info("🧠 Sin filtros → búsqueda semántica pura")
                cepas = await self._busqueda_semantica(pregunta)
                logger.info(f"   ✅ Retornando {len(cepas)} cepas (semántico)")
                return cepas, "semántico"

        # ── Con filtros: aplicar en MongoDB primero ────────────────────
        logger.info("🗄️  Aplicando filtros en MongoDB...")
        subconjunto = await Cepa.find(parsed.filtros).to_list()
        logger.info(
            f"   Subconjunto: {len(subconjunto)} / {total_db} cepas "
            f"({round(len(subconjunto)/total_db*100, 1)}% del total)"
        )

        if not subconjunto:
            logger.warning(
                "⚠️  Filtros sin resultados → fallback a búsqueda semántica completa"
            )
            cepas = await self._busqueda_semantica(pregunta)
            logger.info(f"   ✅ Fallback semántico: {len(cepas)} cepas")
            return cepas, "semántico_fallback"

        if parsed.es_estadistico:
            logger.info(
                f"📊 Modo estadístico → retornando {len(subconjunto)} cepas exactas (sin vector)"
            )
            return subconjunto, "estadístico"

        # ── Híbrido: similitud vectorial sobre el subconjunto ──────────
        logger.info(
            f"🔬 Aplicando similitud vectorial sobre {len(subconjunto)} cepas filtradas..."
        )
        cepas_con_embedding = [c for c in subconjunto if c.embedding]
        logger.debug(
            f"   Cepas con embedding en subconjunto: {len(cepas_con_embedding)} / {len(subconjunto)}"
        )

        if not cepas_con_embedding:
            logger.warning(
                "⚠️  Subconjunto sin embeddings → retornando filtro MongoDB directo"
            )
            return subconjunto, "híbrido_sin_vector"

        query_embedding = self.embedding_service.encode(pregunta)
        ranked = await self._busqueda_vectorial(
            query_embedding,
            cepas_con_embedding,
            limit=len(cepas_con_embedding),  # devolver todas, ya filtradas
            threshold=0.0,                   # sin corte: el filtro ya acotó
        )

        resultado = ranked if ranked else subconjunto
        logger.info(f"   ✅ Híbrido completado: {len(resultado)} cepas rankeadas")
        return resultado, "híbrido"

    async def _busqueda_semantica(self, pregunta: str) -> list[Cepa]:
        """Búsqueda semántica pura con umbral dinámico (mediana + factor·MAD)."""
        from app.core.config import settings

        logger.debug("🧠 Búsqueda semántica — generando embedding de la pregunta...")
        query_embedding = self.embedding_service.encode(pregunta)

        cepas_con_embedding = await Cepa.find(
            {"embedding": {"$exists": True, "$ne": None}}
        ).to_list()
        logger.debug(f"   Cepas con embedding disponibles: {len(cepas_con_embedding)}")

        if not cepas_con_embedding:
            logger.warning("⚠️  No hay embeddings en la DB → retornando todas las cepas")
            return await self.get_todas_las_cepas()

        # Calcular todos los scores primero
        scores: list[tuple[Cepa, float]] = [
            (cepa, self.embedding_service.cosine_similarity(query_embedding, cepa.embedding))
            for cepa in cepas_con_embedding
        ]

        threshold = self._calcular_threshold_dinamico(
            [s for _, s in scores],
            factor=settings.THRESHOLD_STD_FACTOR,
            min_floor=settings.THRESHOLD_MIN_FLOOR,
        )

        # Filtrar y ordenar
        aprobadas = sorted(
            [(cepa, sim) for cepa, sim in scores if sim >= threshold],
            key=lambda x: x[1],
            reverse=True,
        )
        excluidas = sorted(
            [(cepa.cepa, sim) for cepa, sim in scores if sim < threshold],
            key=lambda x: x[1],
        )

        logger.info(f"   ✅ Incluidas: {len(aprobadas)} cepas (threshold dinámico={threshold:.4f})")
        if excluidas:
            logger.debug(f"   🚫 Excluidas del contexto ({len(excluidas)} cepas, bajo threshold):")
            for nombre, sim in excluidas:
                logger.debug(f"      ✗ {nombre}: similitud={sim:.4f}")

        resultado = [cepa for cepa, _ in aprobadas[: settings.MAX_CONTEXT_CEPAS]]
        logger.debug(f"   Semántico: {len(resultado)} cepas enviadas al LLM")
        return resultado

    @staticmethod
    def _calcular_threshold_dinamico(
        scores: list[float],
        factor: float,
        min_floor: float,
    ) -> float:
        """
        Calcula un umbral adaptativo robusto a outliers usando mediana + factor·MAD.

        - Mediana en lugar de media: no se desplaza por outliers extremos.
        - MAD (desviación absoluta mediana): equivalente robusto de la std.
        - min_floor: piso absoluto que evita aceptar cepas off-domain cuando
          toda la distribución de scores es baja.
        - Fallback a SIMILARITY_THRESHOLD si hay menos de 3 scores (sin
          significado estadístico).
        """
        from app.core.config import settings

        if len(scores) < 3:
            logger.debug(
                f"   ⚠️  Pocos scores ({len(scores)}) → usando threshold fijo: "
                f"{settings.SIMILARITY_THRESHOLD}"
            )
            return settings.SIMILARITY_THRESHOLD

        mediana = statistics.median(scores)
        mad = statistics.median([abs(s - mediana) for s in scores])
        dynamic = mediana + factor * mad
        threshold = max(dynamic, min_floor)

        logger.debug(
            f"   📐 Threshold dinámico: mediana={mediana:.4f} | MAD={mad:.4f} | "
            f"factor={factor} | dynamic={dynamic:.4f} | floor={min_floor} | "
            f"→ threshold={threshold:.4f}"
        )
        return threshold

    async def get_embedding_stats(self) -> dict:
        """Retorna estadísticas sobre el estado de los embeddings en la DB"""
        total = await Cepa.count()
        con_embedding = await Cepa.find({"embedding": {"$exists": True, "$ne": None}}).count()
        sin_embedding = total - con_embedding
        porcentaje = round((con_embedding / total * 100), 2) if total > 0 else 0.0

        return {
            "total_cepas": total,
            "cepas_con_embedding": con_embedding,
            "cepas_sin_embedding": sin_embedding,
            "porcentaje_completado": porcentaje,
        }

    async def generar_embeddings_batch(self) -> Tuple[int, float]:
        """Genera y persiste embeddings para todas las cepas que no los tienen"""
        inicio = datetime.now()

        cepas_sin_embedding = await Cepa.find(
            {"$or": [{"embedding": {"$exists": False}}, {"embedding": None}]}
        ).to_list()

        logger.info(f"📦 Cepas sin embedding: {len(cepas_sin_embedding)}")

        if not cepas_sin_embedding:
            logger.info("✅ Todas las cepas ya tienen embedding")
            return 0, 0.0

        textos = [self._cepa_a_texto(cepa) for cepa in cepas_sin_embedding]
        embeddings = self.embedding_service.encode_batch(textos)

        procesadas = 0
        for cepa, embedding in zip(cepas_sin_embedding, embeddings):
            cepa.embedding = embedding
            await cepa.save()
            procesadas += 1

        tiempo_total = (datetime.now() - inicio).total_seconds()
        logger.info(f"✅ {procesadas} embeddings generados y guardados en {tiempo_total:.2f}s")

        return procesadas, tiempo_total


def get_database_service() -> DatabaseService:
    return DatabaseService()