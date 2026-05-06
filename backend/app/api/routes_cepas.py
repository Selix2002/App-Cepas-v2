import csv
import io
import re
from datetime import datetime, timezone
from typing import Annotated, Literal

import openpyxl
from litestar import Controller, get, post, patch, delete
from litestar.datastructures import UploadFile
from litestar.di import Provide
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException, HTTPException
from litestar.params import Body
from litestar.status_codes import HTTP_204_NO_CONTENT
from pydantic import BaseModel

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
    resolve_coords_from_origen,
)
from app.models.models import Cepa
from app.core.security import admin_guard
from app.core.config import settings


def cepa_repository() -> CepaRepository:
    return CepaRepository()


class AddAttributeDTO(BaseModel):
    attribute_name: str
    values: dict[str, str | None]


# ---------------------------------------------------------------------------
# Import helpers
# ---------------------------------------------------------------------------

# Campos fijos del modelo — el resto es dinámico
_FIXED_FIELD_ALIASES: dict[str, str] = {
    "cepa": "cepa",
    "latitud": "latitud",
    "longitud": "longitud",
    "envio_punta_arenas": "envio_punta_arenas",
    "envio punta arenas": "envio_punta_arenas",
    "envio a punta arenas": "envio_punta_arenas",
    "envío punta arenas": "envio_punta_arenas",
    "envío a punta arenas": "envio_punta_arenas",
}

_FLOAT_FIELDS = {"latitud", "longitud"}
_DATE_FIELDS = {"envio_punta_arenas"}
_NULL_VALUES = {"", "n/i", "n/a", "null", "none", "-"}


def _is_null(v: str) -> bool:
    return v.strip().lower() in _NULL_VALUES


def _parse_date(v: str) -> datetime | None:
    v = v.strip()
    if not v or _is_null(v):
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(v, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def _normalize_dynamic_key(header: str) -> str:
    """Convierte un encabezado a clave de campo MongoDB válida."""
    return re.sub(r"[^a-zA-Z0-9_]", "_", header.strip().lower()).strip("_")


def _parse_rows(raw_rows: list[dict[str, str]]) -> list[dict]:
    """Convierte las filas brutas del archivo a dicts listos para MongoDB."""
    parsed = []
    skipped_empty = 0
    for raw in raw_rows:
        doc: dict = {}
        for header, raw_value in raw.items():
            norm_header = header.strip().lower()
            field = _FIXED_FIELD_ALIASES.get(norm_header)

            if field == "cepa":
                val = raw_value.strip()
                if not val or _is_null(val):
                    continue
                doc["cepa"] = val

            elif field in _FLOAT_FIELDS:
                if _is_null(raw_value):
                    doc[field] = None
                else:
                    try:
                        doc[field] = float(raw_value.strip().replace(",", "."))
                    except ValueError:
                        doc[field] = None

            elif field in _DATE_FIELDS:
                doc[field] = _parse_date(raw_value)

            else:
                # Campo dinámico
                key = _normalize_dynamic_key(header)
                if not key:
                    continue
                doc[key] = None if _is_null(raw_value) else raw_value.strip()

        if doc.get("cepa"):
            lat, lon = resolve_coords_from_origen(
                doc.get("origen"), doc.get("latitud"), doc.get("longitud")
            )
            doc["latitud"] = lat
            doc["longitud"] = lon
            parsed.append(doc)
        else:
            skipped_empty += 1

    if settings.debug:
        print(f"[DEBUG][import] _parse_rows: {len(parsed)} válidas, {skipped_empty} sin cepa descartadas")
        if parsed:
            print(f"[DEBUG][import] ejemplo primer doc: {parsed[0]}")

    return parsed


def _read_csv(content: bytes) -> list[dict[str, str]]:
    # Intenta varios encodings — archivos de Excel suelen ser Latin-1/cp1252
    text: str | None = None
    used_encoding = "unknown"
    for encoding in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = content.decode(encoding)
            used_encoding = encoding
            break
        except UnicodeDecodeError:
            continue
    if text is None:
        raise ValueError("No se pudo decodificar el CSV (encodings probados: utf-8, latin-1, cp1252)")

    # Auto-detecta el delimitador (,  ;  \t  |)
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ","

    if settings.debug:
        print(f"[DEBUG][import] CSV encoding={used_encoding!r}  delimiter={delimiter!r}")

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    rows = [dict(row) for row in reader]

    if settings.debug:
        headers = list(rows[0].keys()) if rows else []
        print(f"[DEBUG][import] CSV filas brutas={len(rows)}  columnas={headers}")

    return rows


def _read_xlsx(content: bytes) -> list[dict[str, str]]:
    wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    result = []
    for row in rows[1:]:
        obj = {headers[i]: (str(cell) if cell is not None else "") for i, cell in enumerate(row) if i < len(headers) and headers[i]}
        if any(v.strip() for v in obj.values()):
            result.append(obj)
    return result


class ImportRowResult(BaseModel):
    cepa: str
    status: Literal["created", "duplicate", "error"]
    error: str | None = None


class ImportResultDTO(BaseModel):
    created: int
    skipped: int
    errors: int
    rows: list[ImportRowResult]


# ---------------------------------------------------------------------------
# Controller
# ---------------------------------------------------------------------------

class CepaController(Controller):
    path = "/cepas"
    dependencies = {"repo": Provide(cepa_repository, sync_to_thread=False)}

    # ------------------------------------------------------------------
    # GET ALL
    # ------------------------------------------------------------------
    @get("/")
    async def get_all(
        self,
        repo: CepaRepository,
        cepa: str | None = None,
        offset: int = 0,
    ) -> PaginatedCepasDTO:
        filters = CepaFilterParams(cepa=cepa)
        items, total = await repo.get_all(filters)
        return PaginatedCepasDTO(
            total=total,
            items=[CepaResponseDTO(id=str(c.id), **c.model_dump(exclude={"id"})) for c in items],
        )

    # ------------------------------------------------------------------
    # GET BY ID
    # ------------------------------------------------------------------
    @get("/{cepa_id:str}")
    async def get_by_id(self, cepa_id: str, repo: CepaRepository) -> CepaResponseDTO:
        try:
            cepa = await repo.get_by_id(cepa_id)
        except CepaNotFoundError as e:
            raise NotFoundException(detail=str(e))
        return CepaResponseDTO(id=str(cepa.id), **cepa.model_dump(exclude={"id"}))

    # ------------------------------------------------------------------
    # POST
    # ------------------------------------------------------------------
    @post("/", guards=[admin_guard])
    async def create(self, data: CepaCreateDTO, repo: CepaRepository) -> CepaResponseDTO:
        try:
            cepa = await repo.create(data)
        except CepaAlreadyExistsError as e:
            raise HTTPException(status_code=409, detail=str(e))
        return CepaResponseDTO(id=str(cepa.id), **cepa.model_dump(exclude={"id"}))

    # ------------------------------------------------------------------
    # POST /import — importa cepas desde CSV o Excel
    # ------------------------------------------------------------------
    @post("/import", guards=[admin_guard])
    async def import_from_file(
        self,
        data: Annotated[UploadFile, Body(media_type=RequestEncodingType.MULTI_PART)],
    ) -> ImportResultDTO:
        content = await data.read()
        filename = (data.filename or "").lower()

        if settings.debug:
            print(f"[DEBUG][import] archivo={data.filename!r}  tamaño={len(content)} bytes")

        if filename.endswith((".xlsx", ".xls")):
            raw_rows = _read_xlsx(content)
        else:
            raw_rows = _read_csv(content)

        if settings.debug:
            print(f"[DEBUG][import] filas brutas leídas: {len(raw_rows)}")

        if not raw_rows:
            raise HTTPException(status_code=400, detail="El archivo no contiene filas válidas")

        parsed_rows = _parse_rows(raw_rows)

        if settings.debug:
            print(f"[DEBUG][import] filas a insertar: {len(parsed_rows)}")

        if not parsed_rows:
            raise HTTPException(status_code=400, detail="No se encontraron filas con campo 'cepa' válido")

        results: list[ImportRowResult] = []

        for doc in parsed_rows:
            cepa_name = doc.get("cepa", "")
            try:
                existing = await Cepa.find_one(Cepa.cepa == cepa_name)
                if existing:
                    if settings.debug:
                        print(f"[DEBUG][import] duplicada: {cepa_name!r}")
                    results.append(ImportRowResult(cepa=cepa_name, status="duplicate"))
                    continue

                cepa_obj = Cepa(**doc)
                await cepa_obj.insert()

                # Generar embedding si el módulo IA está disponible
                try:
                    from app.ia.services.chat.embedding_service import get_embedding_service
                    from app.ia.services.chat.dbSearch_service import DatabaseService
                    cepa_obj.embedding = get_embedding_service().encode(
                        DatabaseService._cepa_a_texto(cepa_obj)
                    )
                    await cepa_obj.save()
                except ImportError:
                    pass

                if settings.debug:
                    print(f"[DEBUG][import] creada: {cepa_name!r}")
                results.append(ImportRowResult(cepa=cepa_name, status="created"))

            except Exception as e:
                if settings.debug:
                    print(f"[DEBUG][import] error en {cepa_name!r}: {e}")
                results.append(ImportRowResult(cepa=cepa_name, status="error", error=str(e)))

        return ImportResultDTO(
            created=sum(1 for r in results if r.status == "created"),
            skipped=sum(1 for r in results if r.status == "duplicate"),
            errors=sum(1 for r in results if r.status == "error"),
            rows=results,
        )

    # ------------------------------------------------------------------
    # POST /add-attribute
    # ------------------------------------------------------------------
    @post("/add-attribute", guards=[admin_guard])
    async def add_attribute(self, data: AddAttributeDTO) -> dict:
        field = data.attribute_name.strip()
        if not field:
            raise HTTPException(status_code=400, detail="attribute_name no puede estar vacío")
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', field):
            raise HTTPException(status_code=400, detail="attribute_name solo puede contener letras, números y guión bajo")

        updated = 0
        not_found = []

        for cepa_name, value in data.values.items():
            cepa = await Cepa.find_one(Cepa.cepa == cepa_name)
            if not cepa:
                not_found.append(cepa_name)
                continue
            await cepa.set({field: value, "fecha_actualizacion": datetime.now(timezone.utc)})
            updated += 1

        return {"updated": updated, "not_found": not_found}

    # ------------------------------------------------------------------
    # PATCH
    # ------------------------------------------------------------------
    @patch("/{cepa_id:str}", guards=[admin_guard])
    async def update(self, cepa_id: str, data: CepaUpdateDTO, repo: CepaRepository) -> CepaResponseDTO:
        try:
            cepa = await repo.update(cepa_id, data)
        except CepaNotFoundError as e:
            raise NotFoundException(detail=str(e))
        return CepaResponseDTO(id=str(cepa.id), **cepa.model_dump(exclude={"id"}))

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------
    @delete("/{cepa_id:str}", guards=[admin_guard], status_code=HTTP_204_NO_CONTENT)
    async def delete(self, cepa_id: str, repo: CepaRepository) -> None:
        try:
            await repo.delete(cepa_id)
        except CepaNotFoundError as e:
            raise NotFoundException(detail=str(e))
