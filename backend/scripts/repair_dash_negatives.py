# scripts/repair_dash_negatives.py
"""
Repara el bug B26: hasta 2026-11 el importador trataba "-" (resultado negativo en las
planillas del laboratorio) como valor nulo, así que los negativos quedaron guardados
como None (N/I) en la DB.

El script vuelve a leer la planilla ORIGINAL con los mismos lectores y la misma
normalización de columnas que el importador, y para cada cepa:
  - si en la planilla el valor es "-" y en la DB el campo existe con valor None → escribe "-"
  - si en la DB hay cualquier otro valor (p. ej. editado a mano después) → NO lo toca
  - si el campo no existe en la DB (encabezado distinto, p. ej. "5 °C" leído con otro
    encoding → 5_c en vez de 5_oc) → NO lo crea; se reporta para revisar

Las cepas reparadas quedan marcadas como stale (embedding_stale_since) para que el
timer cepas-reembed regenere sus embeddings (el texto del embedding incluye todos los
atributos). Para no esperar al timer (que solo dispara con >=90 ediciones o >5 días),
forzar el refresh bajando el umbral para esa corrida:
    EMBEDDING_STALE_EDIT_THRESHOLD=1 uv run python -m scripts.check_embeddings_refresh

Uso (desde backend/):
    uv run python -m scripts.repair_dash_negatives --file "data/planilla.xlsx"          # dry-run
    uv run python -m scripts.repair_dash_negatives --file "data/planilla.xlsx" --apply  # escribe

Por defecto es dry-run: solo muestra el reporte, no modifica nada.
"""

import argparse
import asyncio
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from app.api.routes_cepas import _parse_rows, _read_csv, _read_xlsx  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.schema.dtos import HIDDEN_FIELDS, RESERVED_FIELDS  # noqa: E402

_FIXED_FIELDS = {"cepa", "latitud", "longitud", "envio_punta_arenas"}


def _leer_planilla(path: Path) -> list[dict]:
    content = path.read_bytes()
    if path.suffix.lower() in (".xlsx", ".xls"):
        raw_rows = _read_xlsx(content)
    else:
        raw_rows = _read_csv(content)
    return _parse_rows(raw_rows)


async def reparar(path: Path, apply: bool) -> None:
    filas = _leer_planilla(path)
    print(f"Planilla: {path.name} — {len(filas)} filas con cepa")

    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.db_name]
    cepas = db["cepas"]

    por_campo: Counter[str] = Counter()
    conservados: Counter[str] = Counter()  # "-" en planilla pero la DB ya tiene otro valor
    inexistentes: Counter[str] = Counter()  # columna de la planilla que no existe en la DB
    no_encontradas: list[str] = []
    cambios: list[tuple[object, str, dict]] = []  # (_id, nombre, {campo: "-"})

    for fila in filas:
        nombre = fila["cepa"]
        campos_negativos = [
            campo for campo, valor in fila.items()
            if valor == "-"
            and campo not in _FIXED_FIELDS
            and campo not in HIDDEN_FIELDS
            and campo not in RESERVED_FIELDS
        ]
        if not campos_negativos:
            continue

        doc = await cepas.find_one({"cepa": nombre}, {"embedding": 0})
        if doc is None:
            no_encontradas.append(nombre)
            continue

        set_ops: dict[str, str] = {}
        for campo in campos_negativos:
            if campo not in doc:
                inexistentes[campo] += 1
            elif doc[campo] is None:
                set_ops[campo] = "-"
                por_campo[campo] += 1
            elif doc.get(campo) != "-":
                conservados[campo] += 1
        if set_ops:
            cambios.append((doc["_id"], nombre, set_ops))

    total_valores = sum(por_campo.values())
    print(f"\nCepas a reparar: {len(cambios)} — valores a corregir: {total_valores}")
    for campo, n in sorted(por_campo.items()):
        print(f"  {campo:<20} {n}")
    if conservados:
        print("\nNo se tocan (la DB ya tiene otro valor, posiblemente editado a mano):")
        for campo, n in sorted(conservados.items()):
            print(f"  {campo:<20} {n}")
    if inexistentes:
        print("\nColumnas de la planilla que no existen en la DB (no se crean — revisar encabezados):")
        for campo, n in sorted(inexistentes.items()):
            print(f"  {campo:<20} {n}")
    if no_encontradas:
        print(f"\nCepas de la planilla con '-' que NO están en la DB ({len(no_encontradas)}): "
              + ", ".join(no_encontradas[:15]) + (" …" if len(no_encontradas) > 15 else ""))

    if not apply:
        print("\nDry-run: no se modificó nada. Volver a correr con --apply para escribir.")
        client.close()
        return

    if not cambios:
        print("\nNada que escribir.")
        client.close()
        return

    now = datetime.now(timezone.utc)
    for _id, _nombre, set_ops in cambios:
        await cepas.update_one(
            {"_id": _id},
            {"$set": {**set_ops, "fecha_actualizacion": now}},
        )
        # Encola el refresh de embedding (mismo criterio que CepaRepository.update)
        await cepas.update_one(
            {"_id": _id, "embedding_stale_since": None},
            {"$set": {"embedding_stale_since": now}},
        )
    await db["embedding_refresh_state"].update_one(
        {}, {"$inc": {"ediciones_pendientes": len(cambios)}}, upsert=True,
    )
    print(f"\nListo: {len(cambios)} cepas actualizadas y marcadas para refrescar embeddings.")
    print("Para regenerarlos ya: "
          "EMBEDDING_STALE_EDIT_THRESHOLD=1 uv run python -m scripts.check_embeddings_refresh")
    client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--file", required=True, type=Path, help="Planilla original (.xlsx, .xls o .csv)")
    parser.add_argument("--apply", action="store_true", help="Escribe los cambios (sin esto es dry-run)")
    args = parser.parse_args()
    if not args.file.is_file():
        sys.exit(f"No existe el archivo: {args.file}")
    asyncio.run(reparar(args.file, args.apply))


if __name__ == "__main__":
    main()
