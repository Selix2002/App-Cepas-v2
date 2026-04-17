#!/usr/bin/env python3
"""
tests/test_mql.py

Prueba el pipeline MQL (validator → executor) contra las mismas preguntas
de prompts.py, usando consultas MongoDB diseñadas a mano para cada caso.

Las preguntas puramente semánticas/conceptuales se marcan sin MQL y se saltan
la ejecución, al igual que haría el LLM al devolver None.

Uso (desde backend/):
    python tests/test_mql.py
"""

import asyncio
import json
import sys
import time
from pathlib import Path

# Ajustar el path para importar desde backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.models import Cepa, User
from app.ia.services.chat.mql_validator_service import get_mql_validator, MQLValidationError
from app.ia.services.chat.mql_executor_service import get_mql_executor, MQLExecutionError

# ---------------------------------------------------------------------------
# Casos de prueba
# Cada entrada tiene:
#   pregunta      : texto de la pregunta original
#   descripcion   : qué se espera obtener con esta consulta
#   mql           : dict con la query MQL, o None si es semántica/conceptual
# ---------------------------------------------------------------------------

TEST_CASES: list[dict] = [

    # ── Estadístico ──────────────────────────────────────────────────────────

    {
        "pregunta": "¿Cuántas cepas son Gram positivas?",
        "descripcion": "Conteo de cepas con gram='+'",
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {"$match": {"gram": "+"}},
                {"$count": "total"},
            ],
        },
    },

    {
        "pregunta": "¿Cuántas cepas tienen lecitinasa positiva?",
        "descripcion": "Conteo de cepas con lecitinasa='+'",
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {"$match": {"lecitinasa": "+"}},
                {"$count": "total"},
            ],
        },
    },

    {
        "pregunta": "¿Cuántas cepas son resistentes a ampicilina?",
        "descripcion": "Conteo de cepas con amp='R'",
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {"$match": {"amp": "R"}},
                {"$count": "total"},
            ],
        },
    },

    {
        "pregunta": "¿Cuál es el total de cepas que crecen a 37°C?",
        "descripcion": "Conteo de cepas con temp_37c='1.0' (valor positivo en la BD)",
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {"$match": {"temp_37c": "1.0"}},
                {"$count": "total"},
            ],
        },
    },

    # ── Híbrido ──────────────────────────────────────────────────────────────

    {
        "pregunta": "Dame las cepas Gram positivas con mayor actividad enzimática",
        "descripcion": (
            "Cepas gram='+' ordenadas por número de enzimas positivas "
            "(lecitinasa, lipasa, amilasa, proteasa, celulasa, fosfatasa, aia). "
            "Valores positivos: '+', '++', '+++'"
        ),
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {"$match": {"gram": "+"}},
                {
                    "$addFields": {
                        "enzimas_positivas": {
                            "$add": [
                                {"$cond": [{"$in": ["$lecitinasa", ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$lipasa",     ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$amilasa",    ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$proteasa",   ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$celulasa",   ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$fosfatasa",  ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$aia",        ["+", "++", "+++"]]}, 1, 0]},
                            ]
                        }
                    }
                },
                {"$sort":  {"enzimas_positivas": -1}},
                {"$limit": 10},
            ],
        },
    },

    {
        "pregunta": "¿Qué cepas Gram negativas tienen proteasa positiva?",
        "descripcion": "Cepas con gram='-' y proteasa en ['+', '++', '+++']",
        "mql": {
            "type": "find",
            "filter": {"gram": "-", "proteasa": {"$in": ["+", "++", "+++"]}},
        },
    },

    {
        "pregunta": "Muéstrame las cepas resistentes a tetraciclina con sus características",
        "descripcion": "Cepas con te='R'",
        "mql": {
            "type": "find",
            "filter": {"te": "R"},
        },
    },

    # ── Semántico ────────────────────────────────────────────────────────────

    {
        "pregunta": "¿Qué cepa recomendarías para biorremediación de suelos?",
        "descripcion": (
            "Semántica pura — el LLM retornaría None. "
            "Aproximación MQL: cepas con múltiples enzimas activas (≥4) que sugieren "
            "capacidad degradativa"
        ),
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {
                    "$addFields": {
                        "enzimas_positivas": {
                            "$add": [
                                {"$cond": [{"$in": ["$lecitinasa", ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$lipasa",     ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$amilasa",    ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$proteasa",   ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$celulasa",   ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$fosfatasa",  ["+", "++", "+++"]]}, 1, 0]},
                            ]
                        }
                    }
                },
                {"$match":  {"enzimas_positivas": {"$gte": 4}}},
                {"$sort":   {"enzimas_positivas": -1}},
                {"$limit":  10},
            ],
        },
    },

    {
        "pregunta": "¿Cuál de las cepas tiene mejor potencial como biofertilizante?",
        "descripcion": (
            "Semántica pura — el LLM retornaría None. "
            "Aproximación MQL: aia positiva (producción de auxinas) "
            "y fosfatasa positiva (solubilización de fosfatos)"
        ),
        "mql": {
            "type": "find",
            "filter": {
                "aia":      {"$in": ["+", "++", "+++"]},
                "fosfatasa": {"$in": ["+", "++", "+++"]},
            },
        },
    },

    {
        "pregunta": "Describe las cepas con mayor versatilidad metabólica",
        "descripcion": (
            "Semántica/híbrida — el LLM podría intentar MQL. "
            "Aproximación: cepas con 6+ enzimas positivas, ordenadas desc"
        ),
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {
                    "$addFields": {
                        "total_enzimas": {
                            "$add": [
                                {"$cond": [{"$in": ["$lecitinasa", ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$ureasa",     ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$lipasa",     ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$amilasa",    ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$proteasa",   ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$catalasa",   ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$celulasa",   ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$fosfatasa",  ["+", "++", "+++"]]}, 1, 0]},
                                {"$cond": [{"$in": ["$aia",        ["+", "++", "+++"]]}, 1, 0]},
                            ]
                        }
                    }
                },
                {"$sort":   {"total_enzimas": -1}},
                {"$limit":  10},
            ],
        },
    },

    # ── Casos límite ─────────────────────────────────────────────────────────

    {
        "pregunta": "¿Cuántas cepas hay en total?",
        "descripcion": "Conteo total de documentos en la colección cepas",
        "mql": {
            "type": "aggregate",
            "pipeline": [
                {"$count": "total"},
            ],
        },
    },

    {
        "pregunta": "¿Qué significa Gram positiva?",
        "descripcion": (
            "Conceptual pura — no tiene correspondencia MQL. "
            "El LLM retornaría None y el sistema caería al path semántico."
        ),
        "mql": None,  # sin query MQL
    },
]


# ---------------------------------------------------------------------------
# Helpers de impresión
# ---------------------------------------------------------------------------

def sep(char: str = "─", width: int = 70) -> str:
    return char * width


def print_result(n: int, caso: dict, resultado: dict | None, error: str | None, elapsed_ms: int) -> None:
    estado = "✅" if error is None else "❌"
    print(sep())
    print(f"[{n}] {caso['pregunta']}")
    print(f"     {caso['descripcion']}")
    print(sep("·"))

    if caso["mql"] is None:
        print("  MQL          : None (semántica/conceptual — ejecución omitida)")
        return

    tipo = caso["mql"].get("type", "?")
    print(f"  Tipo query   : {tipo}  {estado}")
    print(f"  Tiempo       : {elapsed_ms} ms")

    if error:
        print(f"  Error        : {error}")
        return

    count = resultado.get("count", 0)
    results = resultado.get("results", [])
    print(f"  Resultados   : {count} documento(s)")

    if count == 0:
        print("  (sin resultados — verifica que los valores del campo coincidan con los datos)")
    else:
        # Mostrar los primeros 3 documentos resumidos
        for i, doc in enumerate(results[:3]):
            campos_clave = {
                k: v for k, v in doc.items()
                if k not in ("_id", "fecha_creacion", "fecha_actualizacion", "gen_16s",
                             "metabolomica", "nicolas", "nombre_proyecto")
                and v is not None
            }
            print(f"  Doc {i+1:>2}       : {json.dumps(campos_clave, ensure_ascii=False, default=str)}")
        if count > 3:
            print(f"  ...y {count - 3} más")


def print_summary(casos: list[dict], errores: list[str | None], tiempo_total: float) -> None:
    ejecutados   = sum(1 for c in casos if c["mql"] is not None)
    omitidos     = sum(1 for c in casos if c["mql"] is None)
    fallidos     = sum(1 for e in errores if e is not None)
    exitosos     = ejecutados - fallidos

    print("\n" + sep("═"))
    print("RESUMEN")
    print(sep("═"))
    print(f"  Total casos    : {len(casos)}")
    print(f"  Ejecutados     : {ejecutados}")
    print(f"  Omitidos (sem) : {omitidos}")
    print(f"  Exitosos       : {exitosos}")
    print(f"  Fallidos       : {fallidos}")
    print(f"  Tiempo total   : {tiempo_total:.2f} s")
    print(sep("═"))


# ---------------------------------------------------------------------------
# Setup DB
# ---------------------------------------------------------------------------

async def setup_db() -> None:
    from app.core.config import settings
    client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(database=client[settings.db_name], document_models=[Cepa, User])


# ---------------------------------------------------------------------------
# Runner principal
# ---------------------------------------------------------------------------

async def main() -> None:
    print(sep("═"))
    print("TEST MQL — pipeline validator → executor")
    print(f"Casos totales : {len(TEST_CASES)}")
    print(sep("═") + "\n")

    await setup_db()

    validator = get_mql_validator()
    executor  = get_mql_executor()

    errores: list[str | None] = []
    inicio_total = time.time()

    for i, caso in enumerate(TEST_CASES, start=1):
        elapsed_ms = 0
        resultado  = None
        error      = None

        if caso["mql"] is None:
            errores.append(None)
            print_result(i, caso, None, None, 0)
            continue

        t0 = time.time()
        try:
            validated = validator.validate(caso["mql"])
            resultado = await executor.execute(validated)
        except MQLValidationError as exc:
            error = f"[VALIDACIÓN] {exc}"
        except MQLExecutionError as exc:
            error = f"[EJECUCIÓN]  {exc}"
        except Exception as exc:
            error = f"[INESPERADO] {exc}"
        finally:
            elapsed_ms = int((time.time() - t0) * 1000)

        errores.append(error)
        print_result(i, caso, resultado, error, elapsed_ms)

    tiempo_total = time.time() - inicio_total
    print_summary(TEST_CASES, errores, tiempo_total)


if __name__ == "__main__":
    asyncio.run(main())
