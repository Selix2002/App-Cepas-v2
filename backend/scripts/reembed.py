# scripts/reembed.py
"""
Regenera TODOS los embeddings de las cepas desde cero.

Necesario al cambiar `EMBEDDING_PROVIDER` (local ↔ cohere): cambian el modelo y las
dimensiones (384 ↔ 1024), así que los embeddings viejos quedan incompatibles. Este script
los borra (set null) y los regenera en un solo batch con el provider configurado.

Uso:
    EMBEDDING_PROVIDER=cohere COHERE_API_KEY=... \
        uv run python -m scripts.reembed

Verificar después con:  uv run python -m scripts.check_embeddings
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.models import Cepa


async def reembed() -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(database=client[settings.db_name], document_models=[Cepa])

    print(f"🔁 Re-embed con EMBEDDING_PROVIDER={settings.EMBEDDING_PROVIDER!r}")

    # 1) Borrar los embeddings existentes (dims/modelo viejos) → todos quedan "sin embedding".
    res = await Cepa.get_pymongo_collection().update_many({}, {"$set": {"embedding": None}})
    print(f"🧹 Embeddings borrados en {res.modified_count} cepas")

    # 2) Regenerar en batch (una sola llamada al provider para ≤96 textos).
    #    Import diferido: arrastra el módulo de embeddings solo al ejecutar el script.
    from app.ia.services.chat.dbSearch_service import get_database_service

    procesadas, segundos = await get_database_service().generar_embeddings_batch()
    print(f"✅ {procesadas} embeddings regenerados en {segundos:.2f}s")


if __name__ == "__main__":
    asyncio.run(reembed())
