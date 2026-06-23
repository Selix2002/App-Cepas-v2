# app/schema/dtos.py
from pydantic import BaseModel, Field, field_validator
from typing import Any, Optional
from datetime import datetime


# S18: campos internos/derivados que ningún cliente debe poder asignar vía
# mass-assignment (extra="allow"). Se stripean en los DTOs y se rechazan en add_attribute.
RESERVED_FIELDS = frozenset({"embedding", "fecha_creacion", "fecha_actualizacion", "_id", "id"})


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
    def cepa_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("El nombre de la cepa no puede estar vacío")
        return v

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
        }


# ---------------------------------------------------------------------------
# RESPONSE
# ---------------------------------------------------------------------------
class CepaResponseDTO(BaseModel):
    id: str
    cepa: str
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    envio_punta_arenas: Optional[datetime] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    embedding: Optional[Any] = Field(default=None, exclude=True)

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
