# scripts/migrate_envio_punta_arenas.py
"""
Migra el campo 'envio_punta_arenas' de string "dia-mes" (ej: "15-may")
a ISODate en MongoDB.

Uso:
    python scripts/migrate_envio_punta_arenas.py [--year 2024] [--dry-run]

    --year    Año a usar para los documentos (default: 2024)
    --dry-run Solo muestra qué se convertiría, sin modificar la DB
"""

import asyncio
import sys
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

MESES_ES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4,
    "may": 5, "jun": 6, "jul": 7, "ago": 8,
    "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}


def parsear_fecha(valor: str, year: int) -> datetime | None:
    """Convierte "15-may" en datetime(year, 5, 15). Retorna None si no puede parsear."""
    partes = valor.strip().lower().split("-")
    if len(partes) != 2:
        return None
    dia_str, mes_str = partes
    try:
        dia = int(dia_str)
    except ValueError:
        return None
    mes = MESES_ES.get(mes_str)
    if mes is None:
        return None
    try:
        return datetime(year, mes, dia)
    except ValueError:
        return None


async def migrar(year: int, dry_run: bool) -> None:
    client = AsyncIOMotorClient(settings.mongodb_uri)
    col = client[settings.db_name]["cepas"]

    cursor = col.find(
        {"envio_punta_arenas": {"$type": "string"}},
        {"_id": 1, "cepa": 1, "envio_punta_arenas": 1},
    )
    documentos = await cursor.to_list(length=None)

    if not documentos:
        print("No se encontraron documentos con 'envio_punta_arenas' como string.")
        return

    print(f"{'[DRY-RUN] ' if dry_run else ''}Documentos a migrar: {len(documentos)}\n")

    exito = 0
    error = 0

    for doc in documentos:
        valor_original = doc["envio_punta_arenas"]
        fecha = parsear_fecha(valor_original, year)

        if fecha is None:
            print(f"  → [{doc.get('cepa', doc['_id'])}] '{valor_original}' no es fecha válida → null")
            if not dry_run:
                await col.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"envio_punta_arenas": None}},
                )
            error += 1
            continue

        print(f"  ✓ [{doc.get('cepa', doc['_id'])}] '{valor_original}' → {fecha.date()}")

        if not dry_run:
            await col.update_one(
                {"_id": doc["_id"]},
                {"$set": {"envio_punta_arenas": fecha}},
            )
        exito += 1

    print(f"\nResumen: {exito} convertidos, {error} errores", end="")
    if dry_run:
        print(" [DRY-RUN — ningún cambio aplicado]")
    else:
        print()

    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2024,
                        help="Año a usar para las fechas (default: 2024)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Mostrar cambios sin aplicarlos")
    args = parser.parse_args()

    print(f"Año configurado: {args.year}")
    asyncio.run(migrar(year=args.year, dry_run=args.dry_run))
