# app/ia/services/chat/dbSearch_service.py

import asyncio
import time
import statistics
import numpy as np
from app.models.models import Cepa
from app.ia.services.chat.embedding_service import get_embedding_service
from typing import TYPE_CHECKING, List, Tuple
import logging
from datetime import datetime

if TYPE_CHECKING:
    from app.ia.services.chat.query_parser_service import ParsedQuery

logger = logging.getLogger(__name__)

class DatabaseService:
    """Servicio para búsqueda semántica e híbrida de cepas"""

    # Caché de campos de colección compartida entre instancias (TTL: 5 min)
    _campos_cache: list[str] = []
    _campos_cache_time: float = 0.0
    _CAMPOS_CACHE_TTL: float = 300.0

    # Caché de valores distintos por campo (TTL: 10 min)
    _valores_cache: dict[str, list] = {}
    _valores_cache_time: float = 0.0
    _VALORES_CACHE_TTL: float = 600.0

    # Campos cuyo vocabulario no aporta información útil al LLM
    _CAMPOS_SIN_VALORES: frozenset[str] = frozenset({
        "_id", "id", "embedding",
        "fecha_creacion", "fecha_actualizacion",
        "cepa", "codigo_lab",           # identificadores únicos por documento
        "latitud", "longitud",          # coordenadas numéricas continuas
        "gen_16s", "metabolomica",      # texto libre largo
        "nicolas", "nombre_proyecto",   # texto libre
        "envio_punta_arenas",           # fecha ISODate — alta cardinalidad, sin valores útiles
    })
    _MAX_VALORES_POR_CAMPO: int = 20    # si hay más, se omiten (campo de alta cardinalidad)

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
            query_embedding = await asyncio.to_thread(self.embedding_service.encode, pregunta)
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
                # B1: fallback correcto — _busqueda_vectorial requiere 4 args, no 2
                logger.warning("⚠️  No hay embeddings disponibles, retornando todas las cepas")
                return await self.get_todas_las_cepas()

        except Exception as e:
            # B24: fallback a get_todas_las_cepas() — _busqueda_vectorial requiere
            # (query_embedding, cepas, limit, threshold); llamarlo con (pregunta, limit)
            # lanzaba TypeError y enmascaraba el error original.
            logger.error(f"❌ Error en búsqueda: {str(e)}", exc_info=True)
            return await self.get_todas_las_cepas()

    async def _busqueda_vectorial(
        self,
        query_embedding: List[float],
        cepas: List[Cepa],
        limit: int,
        threshold: float
    ) -> List[Cepa]:
        """Búsqueda por similitud de embeddings (vectorizada con numpy, P3)."""
        logger.debug(f"🔬 Calculando similitudes con {len(cepas)} cepas...")

        cepas_validas = [c for c in cepas if c.embedding]
        cepas_sin = [c for c in cepas if not c.embedding]

        if cepas_sin:
            logger.debug(f"   {len(cepas_sin)} cepas sin embedding omitidas")

        if not cepas_validas:
            logger.warning("⚠️  Ninguna cepa tiene embedding")
            return []

        # P3: matmul batch en lugar de bucle por cepa
        E = np.array([c.embedding for c in cepas_validas], dtype=np.float32)
        q = np.array(query_embedding, dtype=np.float32)
        norms = np.linalg.norm(E, axis=1) * np.linalg.norm(q)
        norms = np.where(norms == 0, 1.0, norms)
        similitudes = (E @ q) / norms

        resultados = [
            (cepa, float(sim))
            for cepa, sim in zip(cepas_validas, similitudes)
            if sim >= threshold
        ]
        resultados.sort(key=lambda x: x[1], reverse=True)

        logger.info(f"✅ Incluidas: {len(resultados)} cepas (similitud >= {threshold})")

        if resultados:
            logger.info("🏆 Top 3 más similares:")
            for i, (cepa, sim) in enumerate(resultados[:3], 1):
                logger.info(f"   {i}. {cepa.cepa} - similitud: {sim:.4f}")

        return [cepa for cepa, _ in resultados[:limit]]

    _EXCLUIR_TEXTO = frozenset({
        "embedding", "fecha_creacion", "fecha_actualizacion", "latitud", "longitud",
    })

    @staticmethod
    def _cepa_a_texto(cepa: Cepa) -> str:
        partes = []

        if cepa.cepa:
            partes.append(f"Cepa {cepa.cepa}")
        if cepa.envio_punta_arenas:
            partes.append(f"Enviada el {cepa.envio_punta_arenas.strftime('%Y-%m-%d')}")

        for key, value in (cepa.__pydantic_extra__ or {}).items():
            if key in DatabaseService._EXCLUIR_TEXTO or value is None or str(value).strip() == "":
                continue
            partes.append(f"{key}: {value}")

        return ". ".join(partes)

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

    async def descubrir_valores_campos(self, campos: list[str]) -> dict[str, list]:
        """
        Para cada campo relevante devuelve sus valores distintos observados en la BD.
        Resultado cacheado 10 min. Útil para que el LLM genere MQL con valores exactos.
        """
        ahora = time.time()
        if ahora - DatabaseService._valores_cache_time < DatabaseService._VALORES_CACHE_TTL:
            logger.debug("📋 Usando caché de valores de campos")
            return DatabaseService._valores_cache

        logger.debug("📋 Descubriendo valores distintos por campo...")
        col = Cepa.get_pymongo_collection()

        campos_a_consultar = [
            c for c in campos
            if c not in self._CAMPOS_SIN_VALORES
        ]

        valores: dict[str, list] = {}
        for campo in campos_a_consultar:
            try:
                distintos = await col.distinct(campo)
                # Filtrar None y normalizar a string para comparación uniforme
                distintos = [v for v in distintos if v is not None]
                if 0 < len(distintos) <= self._MAX_VALORES_POR_CAMPO:
                    valores[campo] = sorted(distintos, key=str)
                # Si supera el máximo, el campo se omite del diccionario
            except Exception as exc:
                logger.warning(f"⚠️  No se pudieron obtener valores de '{campo}': {exc}")

        DatabaseService._valores_cache = valores
        DatabaseService._valores_cache_time = ahora

        logger.debug(f"   Valores descubiertos para {len(valores)} campos")
        return valores

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

        query_embedding = await asyncio.to_thread(self.embedding_service.encode, pregunta)
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
        from app.ia.config import ia_settings as settings

        logger.debug("🧠 Búsqueda semántica — generando embedding de la pregunta...")
        query_embedding = await asyncio.to_thread(self.embedding_service.encode, pregunta)

        cepas_con_embedding = await Cepa.find(
            {"embedding": {"$exists": True, "$ne": None}}  # B8: exclude null embeddings at DB level
        ).to_list()
        logger.debug(f"   Cepas con embedding disponibles: {len(cepas_con_embedding)}")

        if not cepas_con_embedding:
            logger.warning("⚠️  No hay embeddings en la DB → retornando todas las cepas")
            return await self.get_todas_las_cepas()

        # P3: vectorized cosine similarity via numpy matmul
        E = np.array([c.embedding for c in cepas_con_embedding], dtype=np.float32)
        q = np.array(query_embedding, dtype=np.float32)
        norms = np.linalg.norm(E, axis=1) * np.linalg.norm(q)
        norms = np.where(norms == 0, 1.0, norms)
        sims = (E @ q) / norms
        scores: list[tuple[Cepa, float]] = list(zip(cepas_con_embedding, sims.tolist()))

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
        from app.ia.config import ia_settings as settings

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
        embeddings = await asyncio.to_thread(self.embedding_service.encode_batch, textos)

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
