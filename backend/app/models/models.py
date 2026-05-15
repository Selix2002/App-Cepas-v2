from beanie import Document, Indexed
from pydantic import Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone


class User(Document):
    username: Indexed(str, unique=True)
    password: str
    is_admin: bool = False
    hidden_columns: list[str] = Field(default_factory=list)
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_actualizacion: datetime | None = None

    class Settings:
        name = "users"


class ColumnLabels(Document):
    """Mapa de field_name → label original para campos dinámicos de cepas."""
    namespace: str
    labels: dict[str, str] = Field(default_factory=dict)

    class Settings:
        name = "column_labels"


class Cepa(Document):
    model_config = ConfigDict(extra="allow")

    # Campos fijos — todo lo demás se almacena dinámicamente
    cepa: Indexed(str, unique=True)
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    envio_punta_arenas: Optional[datetime] = None

    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_actualizacion: Optional[datetime] = None

    # Usado por el módulo IA para búsqueda semántica
    embedding: Optional[List[float]] = None

    class Settings:
        name = "cepas"
