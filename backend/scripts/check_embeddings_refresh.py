# scripts/check_embeddings_refresh.py
"""
Chequea si hay que refrescar embeddings acumulados y, si corresponde, los regenera
en un solo batch a Cohere/local. Pensado para correr vía systemd timer cada 5h
(ver backend/deploy/systemd/cepas-reembed.{service,timer}) — standalone, no depende
de que el server de la app esté corriendo (mismo patrón que scripts/reembed.py).

Dispara un refresh si:
  A) la cepa stale más antigua lleva más de EMBEDDING_STALE_DAYS días sin refrescar, o
  B) se acumularon >= EMBEDDING_STALE_EDIT_THRESHOLD ediciones sin refrescar.

Cuando dispara, regenera TODAS las cepas actualmente stale en un solo batch (no solo la
que cruzó el umbral).

Mitigación de race conditions (edición concurrente durante la corrida):
  - Snapshot de IDs + fecha_actualizacion al inicio; solo se procesan esas cepas.
  - Escritura con optimistic lock: el update de cada cepa está condicionado a que
    `fecha_actualizacion` siga igual a la capturada. Si alguien la editó de nuevo
    durante la corrida, el update no aplica y la cepa queda stale para el próximo ciclo
    (no se pierde la edición).
  - El contador de ediciones pendientes se descuenta con $inc(-X), no con un `set a 0`,
    para no perder ediciones que hayan entrado durante la corrida.

Manejo de fallos: el estado (embedding_stale_since / ediciones_pendientes) solo se
limpia en éxito confirmado. Un fallo (IA desactivada, error de Cohere) no toca ese
estado → el próximo disparo del timer reintenta solo, sin necesidad de circuit
breaker ni backoff manual.

Uso:
    uv run python -m scripts.check_embeddings_refresh
"""

import asyncio
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.models import Cepa, EmbeddingRefreshState

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("check_embeddings_refresh")


async def _registrar_resultado(resultado: str) -> None:
    await EmbeddingRefreshState.get_pymongo_collection().update_one(
        {},
        {"$set": {"ultimo_intento": datetime.now(timezone.utc), "ultimo_resultado": resultado}},
        upsert=True,
    )


async def run() -> int:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.db_name],
        document_models=[Cepa, EmbeddingRefreshState],
    )

    if not settings.IA_ENABLED:
        logger.info("⏸️  IA_ENABLED=false → no-op")
        await _registrar_resultado("sin_operar: ia_desactivada")
        return 0

    state = await EmbeddingRefreshState.find_one({})
    ediciones_pendientes = state.ediciones_pendientes if state else 0

    stale_cepas = await Cepa.find({"embedding_stale_since": {"$ne": None}}).to_list()

    if not stale_cepas:
        logger.info("✅ Sin cepas stale — nada que hacer")
        await _registrar_resultado("ok: nada pendiente")
        return 0

    ahora = datetime.now(timezone.utc)
    oldest_stale = min(c.embedding_stale_since for c in stale_cepas)
    # Motor/pymongo devuelve datetimes naive (BSON no guarda tzinfo) aunque se hayan
    # escrito como aware-UTC — normalizar antes de restar contra `ahora`.
    if oldest_stale.tzinfo is None:
        oldest_stale = oldest_stale.replace(tzinfo=timezone.utc)
    edad = ahora - oldest_stale

    dispara_por_antiguedad = edad >= timedelta(days=settings.EMBEDDING_STALE_DAYS)
    dispara_por_volumen = ediciones_pendientes >= settings.EMBEDDING_STALE_EDIT_THRESHOLD

    logger.info(
        "📊 Stale: %s cepas | más vieja: %s días (umbral %sd) | ediciones pendientes: %s (umbral %s)",
        len(stale_cepas), edad.days, settings.EMBEDDING_STALE_DAYS,
        ediciones_pendientes, settings.EMBEDDING_STALE_EDIT_THRESHOLD,
    )

    if not (dispara_por_antiguedad or dispara_por_volumen):
        logger.info("⏳ Ningún umbral alcanzado — nada que hacer")
        await _registrar_resultado(
            f"ok: umbral no alcanzado ({len(stale_cepas)} cepas stale, "
            f"{ediciones_pendientes} ediciones, más vieja {edad.days}d)"
        )
        return 0

    logger.info(
        "🚀 Umbral alcanzado (antigüedad=%s, volumen=%s) → refrescando %s cepas",
        dispara_por_antiguedad, dispara_por_volumen, len(stale_cepas),
    )

    X = ediciones_pendientes  # snapshot para el $inc(-X) al final

    try:
        from app.ia.services.chat.embedding_service import get_embedding_service
        from app.ia.services.chat.dbSearch_service import DatabaseService

        embedding_service = get_embedding_service()

        # Snapshot de (cepa, texto, fecha_actualizacion) — la fecha capturada es la
        # clave del optimistic lock al escribir.
        snapshot = [(c, DatabaseService._cepa_a_texto(c), c.fecha_actualizacion) for c in stale_cepas]
        textos = [texto for _, texto, _ in snapshot]

        embeddings = await asyncio.to_thread(
            embedding_service.encode_batch, textos, "search_document"
        )
    except ImportError as e:
        logger.warning("⚠️  Módulo de embeddings no disponible: %s", e)
        await _registrar_resultado(f"sin_operar: módulo de embeddings no disponible ({e})")
        return 1
    except Exception as e:
        logger.error("❌ Fallo generando embeddings en batch: %s", e, exc_info=True)
        await _registrar_resultado(f"error: {e}")
        return 1

    coll = Cepa.get_pymongo_collection()
    actualizadas = 0
    con_edicion_concurrente = 0
    for (cepa, _, fecha_capturada), nuevo_embedding in zip(snapshot, embeddings):
        result = await coll.update_one(
            {"_id": cepa.id, "fecha_actualizacion": fecha_capturada},
            {"$set": {"embedding": nuevo_embedding, "embedding_stale_since": None}},
        )
        if result.modified_count:
            actualizadas += 1
        else:
            con_edicion_concurrente += 1

    await EmbeddingRefreshState.get_pymongo_collection().update_one(
        {}, {"$inc": {"ediciones_pendientes": -X}},
    )

    logger.info(
        "✅ Refresh completo: %s actualizadas, %s con edición concurrente (quedan para el próximo ciclo)",
        actualizadas, con_edicion_concurrente,
    )
    await _registrar_resultado(
        f"ok: {actualizadas} refrescadas, {con_edicion_concurrente} pendientes por edición concurrente"
    )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
