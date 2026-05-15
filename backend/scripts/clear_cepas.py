"""
Script para borrar toda la colección de cepas en cepas_db.
Uso: python clear_cepas.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "cepas_db"
COLLECTION = "cepas"


async def clear_cepas():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION]

    count = await collection.count_documents({})
    print(f"Documentos encontrados: {count}")

    confirm = input(f"¿Seguro que quieres borrar los {count} documentos de '{COLLECTION}'? (s/n): ")
    if confirm.strip().lower() != "s":
        print("Operación cancelada.")
        client.close()
        return

    result = await collection.delete_many({})
    print(f"Documentos eliminados: {result.deleted_count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(clear_cepas())
