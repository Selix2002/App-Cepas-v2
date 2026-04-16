# app/ia/services/chat/schema_service.py
"""
Builds a compact schema description of the 'cepas' collection to send to the LLM.
Only field names are included — no possible values. Dynamic fields are discovered
live from MongoDB via descubrir_campos_coleccion().
"""

_CAMPOS_EXCLUIR: frozenset[str] = frozenset({
    "_id", "id", "embedding",
    "fecha_creacion", "fecha_actualizacion",
})


def get_schema_description(campos: list[str]) -> str:
    """
    Returns a compact, prompt-ready string listing the available field names
    in the 'cepas' collection, excluding internal/system fields.
    """
    utiles = [c for c in campos if c not in _CAMPOS_EXCLUIR]
    campos_str = ", ".join(utiles)
    return f"Campos disponibles en la colección 'cepas' ({len(utiles)}): {campos_str}"
