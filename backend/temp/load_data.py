#!/usr/bin/env python
"""
Importa cepas desde un CSV al backend via POST /cepas.

Uso:
    uv run python -m scripts.import_cepas --file cepas.csv --token <JWT>
    uv run python -m scripts.import_cepas --file cepas.csv --username admin --password secret123
"""
import asyncio
import argparse
import csv
import httpx
from pathlib import Path


API_BASE = "http://localhost:8000"

# Mapeo columnas CSV → campos del modelo
CSV_TO_MODEL = {
    "Cepa":               "cepa",
    "Latitud":            "latitud",
    "Longitud":           "longitud",
    "Código Lab":         "codigo_lab",
    "Origen":             "origen",
    "Pigmentación":       "pigmentacion",
    "Envío a Punta Arenas": "envio_punta_arenas",
    "Temperatura -80°":   "temperatura_80",
    "Medio":              "medio",
    "Gram":               "gram",
    "Morfología 1":       "morfologia_1",
    "Morfología 2":       "morfologia_2",
    "Lecitinasa":         "lecitinasa",
    "Ureasa":             "ureasa",
    "Lipasa":             "lipasa",
    "Amilasa":            "amilasa",
    "Proteasa":           "proteasa",
    "Catalasa":           "catalasa",
    "Celulasa":           "celulasa",
    "Fosfatasa":          "fosfatasa",
    "AIA":                "aia",
    "+ 5°C":              "temp_5c",
    "+ 25°C":             "temp_25c",
    "+ 37°C":             "temp_37c",
    "AMP":                "amp",
    "CTX":                "ctx",
    "CXM":                "cxm",
    "CAZ":                "caz",
    "AK":                 "ak",
    "C":                  "c",
    "TE":                 "te",
    "AM E.COLI":          "am_ecoli",
    "AM SAUREUS":         "am_saureus",
    "Gen. 16s":           "gen_16s",
    "Metabolómica":       "metabolomica",
    "Nicolas":            "nicolas",
    "Nombre del Proyecto": "nombre_proyecto",
}

# Columnas que se ignoran al importar
SKIP_COLUMNS = {"ID", "Prueba_form", "PRUEBA_ARCHIVO"}

# Campos que se convierten a float
FLOAT_FIELDS = {"latitud", "longitud"}


def clean_value(value: str) -> str | None:
    """Limpia espacios y convierte N/I o vacío a None."""
    v = value.strip()
    if v in ("", "N/I"):
        return None
    return v


def parse_row(row: dict) -> dict:
    """Convierte una fila del CSV al formato del modelo."""
    data = {}
    for csv_col, model_field in CSV_TO_MODEL.items():
        raw = row.get(csv_col, "")
        value = clean_value(raw)

        if value is not None and model_field in FLOAT_FIELDS:
            try:
                value = float(value)
            except ValueError:
                value = None  # si no es número, descartar

        data[model_field] = value

    return data


async def get_token(username: str, password: str) -> str:
    """Hace login y retorna el JWT."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/auth/login",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def import_cepas(csv_path: Path, token: str) -> None:
    headers = {"Authorization": f"Bearer {token}"}
    results = {"ok": 0, "skip": 0, "error": 0}

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"→ {len(rows)} cepas encontradas en el CSV\n")

    async with httpx.AsyncClient(timeout=30) as client:
        for row in rows:
            data = parse_row(row)
            cepa_nombre = data.get("cepa", "?")

            resp = await client.post(
                f"{API_BASE}/cepas/",
                json=data,
                headers=headers,
            )

            if resp.status_code == 201:
                print(f"  ✓ {cepa_nombre}")
                results["ok"] += 1
            elif resp.status_code == 409:
                print(f"  ~ {cepa_nombre} (ya existe, se omite)")
                results["skip"] += 1
            else:
                try:
                    body = resp.json()
                    detail = body.get("detail", resp.text)
                    # Muestra errores de validación detallados
                    if isinstance(detail, list):
                        detail = " | ".join(
                            f"{e.get('loc', '')}: {e.get('msg', '')}" for e in detail
                        )
                except Exception:
                    detail = resp.text
                print(f"  ✗ {cepa_nombre} → {resp.status_code}: {detail}")
                if results["error"] == 1:
                    print(f"      PAYLOAD enviado: {data}")
                results["error"] += 1

    print(f"\nResultado: {results['ok']} insertadas, {results['skip']} omitidas, {results['error']} errores")


async def main(args: argparse.Namespace) -> None:
    csv_path = Path(args.file)
    if not csv_path.exists():
        print(f"✗ Archivo no encontrado: {csv_path}")
        return

    # Obtener token
    if args.token:
        token = args.token
    else:
        print("→ Haciendo login...")
        try:
            token = await get_token(args.username, args.password)
            print("✓ Login exitoso\n")
        except httpx.HTTPStatusError as e:
            print(f"✗ Login fallido: {e.response.status_code} {e.response.text}")
            return

    await import_cepas(csv_path, token)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Importar cepas desde CSV")
    parser.add_argument("--file", required=True, help="Ruta al archivo CSV")

    auth_group = parser.add_mutually_exclusive_group(required=True)
    auth_group.add_argument("--token", help="JWT token directo")
    auth_group.add_argument("--username", help="Username para login automático")

    parser.add_argument("--password", help="Password (requerido si se usa --username)")
    args = parser.parse_args()

    if args.username and not args.password:
        parser.error("--password es requerido cuando se usa --username")

    asyncio.run(main(args))
    
        # Para ejecutar desde temp: uv run python -m load_data --file cepas.csv --username sebas --password sebas1234