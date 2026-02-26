from beanie import Document, Indexed
from pydantic import Field,ConfigDict,BaseModel
from typing import Optional,List
from datetime import datetime


class User(Document):
    username: Indexed(str, unique=True)
    password: str                                    # siempre hasheada (bcrypt)
    is_admin: bool = False
    hidden_columns: list[str] = Field(default_factory=list)
    fecha_creacion: datetime = Field(default_factory=datetime.utcnow)
    fecha_actualizacion: datetime | None = None

    class Settings:
        name = "users"


class Cepa(Document):
    model_config = ConfigDict(extra="allow")  # permite campos dinámicos

    cepa: Indexed(str, unique=True)
    codigo_lab: Optional[str] = None
    origen: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None

    gram: Optional[str] = None
    morfologia_1: Optional[str] = None
    morfologia_2: Optional[str] = None
    pigmentacion: Optional[str] = None

    envio_punta_arenas: Optional[str] = None
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

    fecha_creacion: datetime = Field(default_factory=datetime.utcnow)
    fecha_actualizacion: Optional[datetime] = None

    embedding: Optional[List[float]] = None
    class Settings:
        name = "cepas"
        

class ChatMessage(BaseModel):
    pregunta: str = Field(..., min_length=3, max_length=500)
    incluir_fuentes: bool = True

class ChatResponse(BaseModel):
    respuesta: str
    fuentes: Optional[List[dict]] = None
    modelo_usado: str
    tokens_usados: Optional[int] = None