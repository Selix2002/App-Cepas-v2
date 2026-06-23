import asyncio
import re
from datetime import datetime, timezone

from beanie import PydanticObjectId
from beanie.operators import RegEx

from app.models.models import Cepa
from app.schema.dtos import (
    CepaCreateDTO,
    CepaUpdateDTO,
    CepaFilterParams,
    RESERVED_FIELDS,
)


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
    "Lago grey":            (-51.054339, -73.163511),
    "Lago Grey":            (-51.054339, -73.163511),
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
        data = {k: v for k, v in dto.model_dump().items() if k not in RESERVED_FIELDS}
        lat, lon = resolve_coords_from_origen(data.get("origen"), data.get("latitud"), data.get("longitud"))
        data["latitud"] = lat
        data["longitud"] = lon

        cepa = Cepa(**data)
        await cepa.insert()

        # A1: lazy import so CepaRepository doesn't hard-depend on IA packages
        try:
            from app.ia.services.chat.embedding_service import get_embedding_service
            from app.ia.services.chat.dbSearch_service import DatabaseService
            # B20: encode() es CPU-bound y síncrono; to_thread evita bloquear el event loop
            texto = DatabaseService._cepa_a_texto(cepa)
            embedding_service = get_embedding_service()
            cepa.embedding = await asyncio.to_thread(embedding_service.encode, texto)
            await cepa.save()
        except ImportError:
            pass

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
        self, filters: CepaFilterParams
    ) -> tuple[list[Cepa], int]:
        query = Cepa.find()

        if filters.cepa:
            # S10: re.escape prevents ReDoS from user-supplied regex metacharacters
            query = query.find(RegEx(Cepa.cepa, re.escape(filters.cepa), "i"))

        total = await query.count()
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

        # A1: lazy import so CepaRepository doesn't hard-depend on IA packages
        try:
            from app.ia.services.chat.embedding_service import get_embedding_service
            from app.ia.services.chat.dbSearch_service import DatabaseService
            # B20: encode() es CPU-bound y síncrono; to_thread evita bloquear el event loop
            texto = DatabaseService._cepa_a_texto(cepa)
            embedding_service = get_embedding_service()
            cepa.embedding = await asyncio.to_thread(embedding_service.encode, texto)
            await cepa.save()
        except ImportError:
            pass

        return cepa

    # -----------------------------------------------------------------------
    # DELETE
    # -----------------------------------------------------------------------
    async def delete(self, cepa_id: str) -> None:
        cepa = await self.get_by_id(cepa_id)
        await cepa.delete()