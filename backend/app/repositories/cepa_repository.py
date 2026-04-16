from datetime import datetime

from beanie import PydanticObjectId
from beanie.operators import RegEx

from app.models.models import Cepa
from app.schema.dtos import (
    CepaCreateDTO,
    CepaUpdateDTO,
    CepaFilterParams,
)
from app.ia.services.chat.embedding_service import get_embedding_service
from app.ia.services.chat.dbSearch_service import DatabaseService


class CepaNotFoundError(Exception):
    pass


class CepaAlreadyExistsError(Exception):
    pass


class CepaRepository:

    # -----------------------------------------------------------------------
    # CREATE
    # -----------------------------------------------------------------------
    async def create(self, dto: CepaCreateDTO) -> Cepa:
        existing = await Cepa.find_one(Cepa.cepa == dto.cepa)
        if existing:
            raise CepaAlreadyExistsError(f"Ya existe una cepa con nombre '{dto.cepa}'")

        cepa = Cepa(**dto.model_dump())
        await cepa.insert()

        cepa.embedding = get_embedding_service().encode(DatabaseService._cepa_a_texto(cepa))
        await cepa.save()

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
            # búsqueda parcial case-insensitive
            query = query.find(RegEx(Cepa.cepa, filters.cepa, "i"))

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

        update_data["fecha_actualizacion"] = datetime.utcnow()

        await cepa.set(update_data)

        cepa.embedding = get_embedding_service().encode(DatabaseService._cepa_a_texto(cepa))
        await cepa.save()

        return cepa

    # -----------------------------------------------------------------------
    # DELETE
    # -----------------------------------------------------------------------
    async def delete(self, cepa_id: str) -> None:
        cepa = await self.get_by_id(cepa_id)
        await cepa.delete()