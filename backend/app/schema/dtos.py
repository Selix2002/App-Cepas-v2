# app/schema/dtos.py
from pydantic import BaseModel, Field, field_validator
from typing import Any, Optional
from datetime import datetime


# S18: campos internos/derivados que ningún cliente debe poder asignar vía
# mass-assignment (extra="allow"). Se stripean en los DTOs y se rechazan en add_attribute.
RESERVED_FIELDS = frozenset({
    "embedding", "embedding_stale_since", "fecha_creacion", "fecha_actualizacion", "_id", "id",
})

# Campos deshabilitados por decisión de producto (2026-07): dejan de leerse/escribirse vía
# API (tabla/alta en el front, create/update/import en el back), pero el campo del modelo
# Beanie y TODA la lógica que lo rodea (query_parser_service, schema_service, dbSearch_service,
# migrate_envio_punta_arenas.py) se conservan intactos por si se reactivan en el futuro. Se
# stripean junto a RESERVED_FIELDS en los mismos puntos de escritura. Para reactivar: vaciar
# este frozenset (y su espejo en frontend/.../CepasColumns.tsx).
HIDDEN_FIELDS = frozenset({"envio_punta_arenas"})


def _coerce_coord(v: Any) -> Optional[float]:
    """Convierte el valor a float; retorna None si no es numérico."""
    if v is None:
        return None
    if isinstance(v, str):
        try:
            return float(v.replace(",", "."))
        except (ValueError, AttributeError):
            return None
    if isinstance(v, (int, float)):
        return float(v)
    return None


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------
class CepaCreateDTO(BaseModel):
    cepa: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    envio_punta_arenas: Optional[datetime] = None

    model_config = {"extra": "allow"}

    @field_validator("cepa")
    @classmethod
    def cepa_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El nombre de la cepa no puede estar vacío")
        return v.strip()

    @field_validator("latitud", mode="before")
    @classmethod
    def latitud_valid(cls, v: Any) -> Optional[float]:
        v = _coerce_coord(v)
        if v is not None and not (-90 <= v <= 90):
            raise ValueError(f"Latitud inválida: {v}. Debe estar entre -90 y 90")
        return v

    @field_validator("longitud", mode="before")
    @classmethod
    def longitud_valid(cls, v: Any) -> Optional[float]:
        v = _coerce_coord(v)
        if v is not None and not (-180 <= v <= 180):
            raise ValueError(f"Longitud inválida: {v}. Debe estar entre -180 y 180")
        return v


# ---------------------------------------------------------------------------
# UPDATE — todos opcionales (PATCH semántico)
# ---------------------------------------------------------------------------
class CepaUpdateDTO(BaseModel):
    cepa: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    envio_punta_arenas: Optional[datetime] = None

    model_config = {"extra": "allow"}

    @field_validator("cepa")
    @classmethod
    def cepa_not_empty(cls, v: Optional[str]) -> str:
        # B4: el validator NO corre cuando 'cepa' está ausente (Pydantic no valida defaults),
        # así que rechazar None aquí solo afecta a 'cepa' enviado explícitamente como null/vacío.
        # Sin esto, PATCH {"cepa": null} guardaba cepa=null → rompía el índice único.
        if v is None or not v.strip():
            raise ValueError("El nombre de la cepa no puede ser vacío ni nulo")
        return v.strip()

    @field_validator("latitud", mode="before")
    @classmethod
    def latitud_valid(cls, v: Any) -> Optional[float]:
        v = _coerce_coord(v)
        if v is not None and not (-90 <= v <= 90):
            raise ValueError(f"Latitud inválida: {v}. Debe estar entre -90 y 90")
        return v

    @field_validator("longitud", mode="before")
    @classmethod
    def longitud_valid(cls, v: Any) -> Optional[float]:
        v = _coerce_coord(v)
        if v is not None and not (-180 <= v <= 180):
            raise ValueError(f"Longitud inválida: {v}. Debe estar entre -180 y 180")
        return v

    def to_update_dict(self) -> dict:
        """
        Retorna todos los campos enviados listos para MongoDB.
        - Campos ausentes: excluidos (no se tocan en DB)
        - Strings vacíos enviados explícitamente: guardados como None
        - Incluye campos dinámicos (extra) enviados por el cliente
        """
        raw = self.model_dump(exclude_unset=True)
        return {
            k: None if isinstance(v, str) and not v.strip() else v
            for k, v in raw.items()
            if k not in RESERVED_FIELDS  # S18: descarta campos internos colados como extra
            and k not in HIDDEN_FIELDS  # campo deshabilitado — ver comentario junto a HIDDEN_FIELDS
        }


# ---------------------------------------------------------------------------
# RESPONSE
# ---------------------------------------------------------------------------
class CepaResponseDTO(BaseModel):
    id: str
    cepa: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    # Deshabilitado — ver HIDDEN_FIELDS. exclude=True: nunca se serializa en la respuesta,
    # igual que embedding.
    envio_punta_arenas: Optional[datetime] = Field(default=None, exclude=True)
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    embedding: Optional[Any] = Field(default=None, exclude=True)
    embedding_stale_since: Optional[datetime] = Field(default=None, exclude=True)

    model_config = {"from_attributes": True, "extra": "allow"}


# ---------------------------------------------------------------------------
# PAGINACIÓN
# ---------------------------------------------------------------------------
class PaginatedCepasDTO(BaseModel):
    total: int
    items: list[CepaResponseDTO]


# ---------------------------------------------------------------------------
# FILTROS — query params para GET /cepas
# ---------------------------------------------------------------------------
class CepaFilterParams(BaseModel):
    cepa: Optional[str] = None
