from litestar import Controller, get, post, patch, delete
from litestar.di import Provide
from litestar.exceptions import NotFoundException, HTTPException
from litestar.status_codes import HTTP_204_NO_CONTENT

from app.schema.dtos import (
    CepaCreateDTO,
    CepaUpdateDTO,
    CepaResponseDTO,
    PaginatedCepasDTO,
    CepaFilterParams,
)
from app.repositories.cepa_repository import (
    CepaRepository,
    CepaNotFoundError,
    CepaAlreadyExistsError,
)
from app.models.models import User  # tu modelo de usuario
from app.core.security import admin_guard  # guard que verifica rol admin


def cepa_repository() -> CepaRepository:
    return CepaRepository()


class CepaController(Controller):
    path = "/cepas"
    dependencies = {"repo": Provide(cepa_repository, sync_to_thread=False)}

    # ------------------------------------------------------------------
    # GET ALL  — acceso público
    # ------------------------------------------------------------------
    @get("/")
    async def get_all(
        self,
        repo: CepaRepository,
        origen: str | None = None,
        cepa: str | None = None,
        #limit: int = 20,
        offset: int = 0,
    ) -> PaginatedCepasDTO:
        filters = CepaFilterParams(
            cepa=cepa,
            #limit=limit,
            #offset=offset,
        )
        items, total = await repo.get_all(filters)
        return PaginatedCepasDTO(
            total=total,
            #limit=filters.limit,
            #offset=filters.offset,
            items=[CepaResponseDTO(id=str(c.id), **c.model_dump(exclude={"id"})) for c in items],
        )

    # ------------------------------------------------------------------
    # GET BY ID  — acceso público
    # ------------------------------------------------------------------
    @get("/{cepa_id:str}")
    async def get_by_id(
        self,
        cepa_id: str,
        repo: CepaRepository,
    ) -> CepaResponseDTO:
        try:
            cepa = await repo.get_by_id(cepa_id)
        except CepaNotFoundError as e:
            raise NotFoundException(detail=str(e))

        return CepaResponseDTO(id=str(cepa.id), **cepa.model_dump(exclude={"id"}))

    # ------------------------------------------------------------------
    # POST  — solo admins
    # ------------------------------------------------------------------
    @post("/", guards=[admin_guard])
    async def create(
        self,
        data: CepaCreateDTO,
        repo: CepaRepository,
    ) -> CepaResponseDTO:
        try:
            cepa = await repo.create(data)
        except CepaAlreadyExistsError as e:
            raise HTTPException(status_code=409, detail=str(e))

        return CepaResponseDTO(id=str(cepa.id), **cepa.model_dump(exclude={"id"}))

    # ------------------------------------------------------------------
    # PATCH  — solo admins
    # ------------------------------------------------------------------
    @patch("/{cepa_id:str}", guards=[admin_guard])
    async def update(
        self,
        cepa_id: str,
        data: CepaUpdateDTO,
        repo: CepaRepository,
    ) -> CepaResponseDTO:
        try:
            cepa = await repo.update(cepa_id, data)
        except CepaNotFoundError as e:
            raise NotFoundException(detail=str(e))

        return CepaResponseDTO(id=str(cepa.id), **cepa.model_dump(exclude={"id"}))

    # ------------------------------------------------------------------
    # DELETE  — solo admins
    # ------------------------------------------------------------------
    @delete("/{cepa_id:str}", guards=[admin_guard], status_code=HTTP_204_NO_CONTENT)
    async def delete(
        self,
        cepa_id: str,
        repo: CepaRepository,
    ) -> None:
        try:
            await repo.delete(cepa_id)
        except CepaNotFoundError as e:
            raise NotFoundException(detail=str(e))