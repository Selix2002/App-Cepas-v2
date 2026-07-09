import asyncio
import logging
import re
from datetime import datetime, timezone

from beanie import PydanticObjectId
from beanie.operators import RegEx

from app.core.config import settings
from app.models.models import Cepa, EmbeddingRefreshState
from app.schema.dtos import (
    CepaCreateDTO,
    CepaUpdateDTO,
    CepaFilterParams,
    RESERVED_FIELDS,
    HIDDEN_FIELDS,
)


logger = logging.getLogger(__name__)


class CepaNotFoundError(Exception):
    pass


class CepaAlreadyExistsError(Exception):
    pass


# ---------------------------------------------------------------------------
# Coordenadas por origen conocido
# ---------------------------------------------------------------------------

# Clave: nombre normalizado (minúsculas, sin espacios extra)
# Valor: (latitud, longitud)
ORIGEN_COORDS: dict[str, tuple[float, float]] = {
    "planta laguna amarga": (-50.975656, -72.749295),
    "planta l. amarga":     (-50.975656, -72.749295),
    "laguna amarga":        (-50.975656, -72.749295),
    "lago pehoe":           (-51.099674, -73.066238),
    "lago grey":            (-51.054339, -73.163511),
    "lago maravilloso":       (-51.315441, -72.758702),
    "cascada lm":           (-39.522724, -72.034290),   
}


def resolve_coords_from_origen(
    origen: str | None,
    current_lat: float | None,
    current_lon: float | None,
) -> tuple[float | None, float | None]:
    """Devuelve (lat, lon) rellenando desde ORIGEN_COORDS si aún no están definidas."""
    if current_lat is not None and current_lon is not None:
        return current_lat, current_lon
    if not origen:
        return current_lat, current_lon
    coords = ORIGEN_COORDS.get(origen.strip().lower())
    if coords:
        return coords
    return current_lat, current_lon


class CepaRepository:

    # -----------------------------------------------------------------------
    # CREATE
    # -----------------------------------------------------------------------
    async def create(self, dto: CepaCreateDTO) -> Cepa:
        existing = await Cepa.find_one(Cepa.cepa == dto.cepa)
        if existing:
            raise CepaAlreadyExistsError(f"Ya existe una cepa con nombre '{dto.cepa}'")

        # S18: descarta campos internos colados vía extra="allow" (embedding, fecha_*, _id)
        # + campos deshabilitados (HIDDEN_FIELDS, ver dtos.py)
        data = {
            k: v for k, v in dto.model_dump().items()
            if k not in RESERVED_FIELDS and k not in HIDDEN_FIELDS
        }
        lat, lon = resolve_coords_from_origen(data.get("origen"), data.get("latitud"), data.get("longitud"))
        data["latitud"] = lat
        data["longitud"] = lon

        cepa = Cepa(**data)

        # B22: el embedding es best-effort y se genera ANTES del insert → una sola escritura.
        # Un fallo NO debe tumbar el alta (la cepa es válida), pero tampoco ser silencioso.
        # A1: lazy import so CepaRepository doesn't hard-depend on IA packages
        try:
            from app.ia.services.chat.embedding_service import get_embedding_service
            from app.ia.services.chat.dbSearch_service import DatabaseService
            # B20: encode() es CPU-bound y síncrono; to_thread evita bloquear el event loop
            texto = DatabaseService._cepa_a_texto(cepa)
            embedding_service = get_embedding_service()
            cepa.embedding = await asyncio.to_thread(
                embedding_service.encode, texto, "search_document"
            )
        except ImportError:
            pass  # módulo IA no disponible (IA_ENABLED=false) → alta sin embedding, esperado
        except Exception as e:
            # B22: antes solo se atrapaba ImportError → cualquier otro fallo daba 500 tras insert.
            logger.warning("Cepa %r insertada sin embedding: %s", cepa.cepa, e)

        await cepa.insert()
        return cepa

    # -----------------------------------------------------------------------
    # GET BY ID
    # -----------------------------------------------------------------------
    async def get_by_id(self, cepa_id: str) -> Cepa:
        try:
            obj_id = PydanticObjectId(cepa_id)
        except Exception:
            raise CepaNotFoundError(f"ID inválido: '{cepa_id}'")

        cepa = await Cepa.get(obj_id)
        if not cepa:
            raise CepaNotFoundError(f"Cepa con id '{cepa_id}' no encontrada")
        return cepa

    # -----------------------------------------------------------------------
    # GET LIST (con filtros y paginación)
    # -----------------------------------------------------------------------
    async def get_all(
        self, filters: CepaFilterParams, offset: int = 0, limit: int | None = None
    ) -> tuple[list[Cepa], int]:
        query = Cepa.find()

        if filters.cepa:
            # S10: re.escape prevents ReDoS from user-supplied regex metacharacters
            query = query.find(RegEx(Cepa.cepa, re.escape(filters.cepa), "i"))

        # total ANTES de paginar, para metadata de paginación correcta
        total = await query.count()

        # B23: offset/limit son opt-in. Sin ellos, devuelve todo (el dashboard
        # —tabla/mapa/charts/export— depende del dataset completo a la escala actual).
        if offset and offset > 0:
            query = query.skip(offset)
        if limit is not None and limit > 0:
            query = query.limit(limit)

        items = await query.to_list()

        return items, total

    # -----------------------------------------------------------------------
    # UPDATE (PATCH — solo campos enviados)
    # -----------------------------------------------------------------------
    async def update(self, cepa_id: str, dto: CepaUpdateDTO) -> Cepa:
        cepa = await self.get_by_id(cepa_id)

        update_data = dto.to_update_dict()
        if not update_data:
            return cepa  # nada que actualizar

        # B21: si cambia el nombre, verificar unicidad antes de set() (igual que UserRepository)
        # — sin esto, un nombre duplicado provoca DuplicateKeyError → 500.
        if "cepa" in update_data:
            existing = await Cepa.find_one(Cepa.cepa == update_data["cepa"])
            if existing and str(existing.id) != cepa_id:
                raise CepaAlreadyExistsError(
                    f"Ya existe una cepa con nombre '{update_data['cepa']}'"
                )

        update_data["fecha_actualizacion"] = datetime.now(timezone.utc)

        await cepa.set(update_data)

        # El embedding ya NO se regenera acá (bloqueaba el request/front hasta que Cohere
        # respondía). En su lugar se marca la cepa como stale y se encola para el refresh
        # en background (systemd timer + scripts/check_embeddings_refresh.py, cada 5h),
        # que la procesa cuando se acumulan EMBEDDING_STALE_EDIT_THRESHOLD ediciones o la
        # más vieja lleva EMBEDDING_STALE_DAYS días sin refrescar.
        if settings.IA_ENABLED:
            try:
                await self._encolar_refresh_embedding(cepa.id)
            except Exception as e:
                logger.warning(
                    "Cepa %r actualizada sin poder encolar refresh de embedding: %s", cepa.cepa, e
                )

        return cepa

    async def _encolar_refresh_embedding(self, cepa_id: PydanticObjectId) -> None:
        """Marca la cepa como stale (solo en la transición fresh→stale) e incrementa el
        contador global de ediciones pendientes. Ambas escrituras son updates atómicos
        de Mongo (filtro condicional / $inc con upsert) — sin race conditions entre
        ediciones concurrentes."""
        now = datetime.now(timezone.utc)
        await Cepa.get_pymongo_collection().update_one(
            {"_id": cepa_id, "embedding_stale_since": None},
            {"$set": {"embedding_stale_since": now}},
        )
        await EmbeddingRefreshState.get_pymongo_collection().update_one(
            {}, {"$inc": {"ediciones_pendientes": 1}}, upsert=True,
        )

    # -----------------------------------------------------------------------
    # DELETE
    # -----------------------------------------------------------------------
    async def delete(self, cepa_id: str) -> None:
        cepa = await self.get_by_id(cepa_id)
        await cepa.delete()