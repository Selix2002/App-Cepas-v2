# scripts/check_embeddings.py

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.models import Cepa
from app.core.config import settings


async def check_embeddings():
    """Verifica el estado de los embeddings en la DB"""
    
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=client[settings.db_name],
        document_models=[Cepa]
    )
    
    print("📊 VERIFICANDO EMBEDDINGS EN LA BASE DE DATOS\n")
    print("="*80)
    
    # Contar total
    total = await Cepa.count()
    print(f"Total de cepas: {total}")
    
    # Contar con embedding
    con_embedding = await Cepa.find({"embedding": {"$exists": True}}).count()
    print(f"Cepas con embedding: {con_embedding}")
    
    # Contar sin embedding
    sin_embedding = total - con_embedding
    print(f"Cepas sin embedding: {sin_embedding}")
    
    porcentaje = (con_embedding / total * 100) if total > 0 else 0
    print(f"Porcentaje completado: {porcentaje:.2f}%")
    
    print("\n" + "="*80)
    
    # Mostrar algunas con embedding
    if con_embedding > 0:
        print("\n✅ CEPAS CON EMBEDDING (primeras 5):\n")
        cepas_con = await Cepa.find({"embedding": {"$exists": True}}).limit(5).to_list()
        for i, cepa in enumerate(cepas_con, 1):
            print(f"{i}. {cepa.cepa}")
            print(f"   Embedding: {len(cepa.embedding)} dimensiones")
            print(f"   Rango: [{min(cepa.embedding):.4f}, {max(cepa.embedding):.4f}]")
            print()
    
    # Mostrar algunas sin embedding
    if sin_embedding > 0:
        print("\n❌ CEPAS SIN EMBEDDING (primeras 5):\n")
        cepas_sin = await Cepa.find({"embedding": {"$exists": False}}).limit(5).to_list()
        for i, cepa in enumerate(cepas_sin, 1):
            print(f"{i}. {cepa.cepa} (ID: {cepa.id})")


if __name__ == "__main__":
    asyncio.run(check_embeddings())