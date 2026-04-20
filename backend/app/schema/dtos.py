#// app/schema/dtos.py
from pydantic import BaseModel, Field, field_validator
from typing import Any,Optional
from datetime import datetime


def _coerce_coord(v: Any) -> Optional[float]:
    """Convierte el valor a float. Si es string o no es numérico, retorna None."""
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
# Valores permitidos (los que aparecen en los datos reales)
# ---------------------------------------------------------------------------
ACTIVIDAD_VALUES = {"+", "++", "+++", "-", "P", "N/I", "wp", None}
ANTIBIOTICO_VALUES = {"R", "S", "I", "P", "N/I", "?", None}


# ---------------------------------------------------------------------------
# CREATE — campos requeridos y opcionales al insertar
# ---------------------------------------------------------------------------
class CepaCreateDTO(BaseModel):
    cepa: str
    codigo_lab: Optional[str] = None
    origen: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    gram: Optional[str] = None
    morfologia_1: Optional[str] = None
    morfologia_2: Optional[str] = None
    pigmentacion: Optional[str] = None
    envio_punta_arenas: Optional[datetime] = None
    temperatura_80: Optional[str] = None
    medio: Optional[str] = None

    lecitinasa: Optional[str] = None
    ureasa: Optional[str] = None
    lipasa: Optional[str] = None
    amilasa: Optional[str] = None
    proteasa: Optional[str] = None
    catalasa: Optional[str] = None
    celulasa: Optional[str] = None
    fosfatasa: Optional[str] = None
    aia: Optional[str] = None

    temp_5c: Optional[str] = None
    temp_25c: Optional[str] = None
    temp_37c: Optional[str] = None

    amp: Optional[str] = None
    ctx: Optional[str] = None
    cxm: Optional[str] = None
    caz: Optional[str] = None
    ak: Optional[str] = None
    c: Optional[str] = None
    te: Optional[str] = None
    am_ecoli: Optional[str] = None
    am_saureus: Optional[str] = None

    gen_16s: Optional[str] = None
    metabolomica: Optional[str] = None
    nicolas: Optional[str] = None
    nombre_proyecto: Optional[str] = None
    model_config = {"extra": "allow"}  # no se permiten campos adicionales

    @field_validator("cepa")
    @classmethod
    def cepa_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("El nombre de la cepa no puede estar vacío")
        return v.strip()

    @field_validator("gram")
    @classmethod
    def gram_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in {"+", "-", "N/I"}:
            raise ValueError(f"Valor de gram inválido: '{v}'. Debe ser '+', '-' o 'N/I'")
        return v


# ---------------------------------------------------------------------------
# UPDATE — todos opcionales (PATCH semántico)
# ---------------------------------------------------------------------------

# Campos str del modelo (para normalizar vacíos a None en el update)
_STR_FIELDS = {
    "cepa", "codigo_lab", "origen", "gram", "morfologia_1", "morfologia_2",
    "pigmentacion", "temperatura_80", "medio",
    "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa", "catalasa",
    "celulasa", "fosfatasa", "aia", "temp_5c", "temp_25c", "temp_37c",
    "amp", "ctx", "cxm", "caz", "ak", "c", "te", "am_ecoli", "am_saureus",
    "gen_16s", "metabolomica", "nicolas", "nombre_proyecto",
}


class CepaUpdateDTO(BaseModel):
    cepa: Optional[str] = None          # ahora editable
    codigo_lab: Optional[str] = None
    origen: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    gram: Optional[str] = None
    morfologia_1: Optional[str] = None
    morfologia_2: Optional[str] = None
    pigmentacion: Optional[str] = None
    envio_punta_arenas: Optional[datetime] = None
    temperatura_80: Optional[str] = None
    medio: Optional[str] = None

    lecitinasa: Optional[str] = None
    ureasa: Optional[str] = None
    lipasa: Optional[str] = None
    amilasa: Optional[str] = None
    proteasa: Optional[str] = None
    catalasa: Optional[str] = None
    celulasa: Optional[str] = None
    fosfatasa: Optional[str] = None
    aia: Optional[str] = None

    temp_5c: Optional[str] = None
    temp_25c: Optional[str] = None
    temp_37c: Optional[str] = None

    amp: Optional[str] = None
    ctx: Optional[str] = None
    cxm: Optional[str] = None
    caz: Optional[str] = None
    ak: Optional[str] = None
    c: Optional[str] = None
    te: Optional[str] = None
    am_ecoli: Optional[str] = None
    am_saureus: Optional[str] = None

    gen_16s: Optional[str] = None
    metabolomica: Optional[str] = None
    nicolas: Optional[str] = None
    nombre_proyecto: Optional[str] = None

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
        Retorna todos los campos enviados listos para guardar en MongoDB.
        - Campos ausentes (None por default): excluidos — no se tocan en DB
        - Campos str explícitamente enviados como "" o "  ": se guardan como None
        - Campos con valor real: se guardan tal cual
        """
        # model_fields_set contiene solo los campos que el cliente envió explícitamente
        data = {}
        for field in self.model_fields_set:
            value = getattr(self, field)
            if field in _STR_FIELDS and isinstance(value, str) and not value.strip():
                data[field] = None   # string vacío → null en DB
            else:
                data[field] = value
        return data


# ---------------------------------------------------------------------------
# RESPONSE — lo que devuelve la API
# ---------------------------------------------------------------------------
class CepaResponseDTO(BaseModel):
    id: str
    cepa: str
    codigo_lab: Optional[str] = None
    origen: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    gram: Optional[str] = None
    morfologia_1: Optional[str] = None
    morfologia_2: Optional[str] = None
    pigmentacion: Optional[str] = None
    envio_punta_arenas: Optional[datetime] = None
    temperatura_80: Optional[str] = None
    medio: Optional[str] = None

    lecitinasa: Optional[str] = None
    ureasa: Optional[str] = None
    lipasa: Optional[str] = None
    amilasa: Optional[str] = None
    proteasa: Optional[str] = None
    catalasa: Optional[str] = None
    celulasa: Optional[str] = None
    fosfatasa: Optional[str] = None
    aia: Optional[str] = None

    temp_5c: Optional[str] = None
    temp_25c: Optional[str] = None
    temp_37c: Optional[str] = None

    amp: Optional[str] = None
    ctx: Optional[str] = None
    cxm: Optional[str] = None
    caz: Optional[str] = None
    ak: Optional[str] = None
    c: Optional[str] = None
    te: Optional[str] = None
    am_ecoli: Optional[str] = None
    am_saureus: Optional[str] = None

    gen_16s: Optional[str] = None
    metabolomica: Optional[str] = None
    nicolas: Optional[str] = None
    nombre_proyecto: Optional[str] = None
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    embedding: Optional[Any] = Field(default=None, exclude=True)

    model_config = {"from_attributes": True, "extra": "allow"}

# ---------------------------------------------------------------------------
# PAGINACIÓN — respuesta envuelta con metadata
# ---------------------------------------------------------------------------
class PaginatedCepasDTO(BaseModel):
    total: int
    #limit: int
    #offset: int
    items: list[CepaResponseDTO]


# ---------------------------------------------------------------------------
# FILTROS — query params para GET /cepas
# ---------------------------------------------------------------------------
class CepaFilterParams(BaseModel):
    #origen: Optional[str] = None
    cepa: Optional[str] = None          # búsqueda parcial por nombre
    # limit: int = 20                   # desactivado — retorna todas las cepas
    #offset: int = 0

    #@field_validator("offset")
    #@classmethod
    #def offset_positive(cls, v: int) -> int:
    #   if v < 0:
    #        raise ValueError("offset no puede ser negativo")
    #    return v