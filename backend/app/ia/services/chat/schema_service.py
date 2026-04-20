# app/ia/services/chat/schema_service.py
"""
Builds a compact schema description of the 'cepas' collection to send to the LLM.
Field names are discovered live from MongoDB; distinct values per field are included
so the LLM generates MQL with the exact stored values instead of guessing.
"""

_CAMPOS_EXCLUIR: frozenset[str] = frozenset({
    "_id", "id", "embedding",
    "fecha_creacion", "fecha_actualizacion",
})

# Campos almacenados como ISODate en MongoDB
_CAMPOS_FECHA: frozenset[str] = frozenset({"envio_punta_arenas"})

_FECHA_HINT = (
    '[tipo: fecha ISODate — comparar con {"$date":"YYYY-MM-DDTHH:MM:SSZ"}. '
    'Ej: {"envio_punta_arenas":{"$gt":{"$date":"2024-05-01T00:00:00Z"}}}]'
)


def get_schema_description(campos: list[str], valores: dict[str, list] | None = None) -> str:
    """
    Returns a prompt-ready string with field names and, when available, their
    distinct values as observed in the database.

    Example output line:
        gram [valores: "+", "-", "N/I"]
        lecitinasa [valores: "+", "++", "+++", "-", "N/I"]
        cepa
    """
    utiles = [c for c in campos if c not in _CAMPOS_EXCLUIR]

    if not valores:
        campos_str = ", ".join(utiles)
        return (
            f"Colección 'cepas' — {len(utiles)} campos disponibles: {campos_str}\n"
            "IMPORTANTE: usa los valores exactos almacenados al construir filtros MQL."
        )

    lineas: list[str] = []
    for campo in utiles:
        if campo in _CAMPOS_FECHA:
            lineas.append(f"  {campo} {_FECHA_HINT}")
            continue
        vals = valores.get(campo)
        if vals:
            vals_str = ", ".join(f'"{v}"' for v in vals)
            lineas.append(f"  {campo} [valores: {vals_str}]")
        else:
            lineas.append(f"  {campo}")

    campos_block = "\n".join(lineas)
    return (
        f"Colección 'cepas' — {len(utiles)} campos disponibles:\n"
        f"{campos_block}\n"
        "IMPORTANTE: usa SIEMPRE los valores exactos listados al construir filtros MQL. "
        "No uses palabras como 'positivo', 'negativo', 'resistente' — usa el valor real del campo."
    )
