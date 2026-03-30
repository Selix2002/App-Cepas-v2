import re
import time
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Resultado del parser
# ---------------------------------------------------------------------------

@dataclass
class ParsedQuery:
    filtros: dict[str, Any]
    modo: str  # "estadístico" | "semántico" | "híbrido"
    terminos_detectados: list[str]
    es_estadistico: bool


# ---------------------------------------------------------------------------
# Servicio de parsing
# ---------------------------------------------------------------------------

class QueryParserService:

    # Gram
    _GRAM_POSITIVO = [r"\bgram\s*\+", r"\bgram\s*positiv", r"\bgrampositiv"]
    _GRAM_NEGATIVO = [r"\bgram\s*-", r"\bgram\s*negativ", r"\bgramnegativ"]

    # Tests enzimáticos fijos
    _TESTS = [
        "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa",
        "catalasa", "celulasa", "fosfatasa", "aia",
    ]

    # Antibióticos: nombre legible → campo en modelo
    _ANTIBIOTICOS = {
        "ampicilina": "amp",
        "cefotaxima": "ctx",
        "cefuroxima": "cxm",
        "ceftazidima": "caz",
        "amikacina": "ak",
        "cloranfenicol": "c",
        "tetraciclina": "te",
    }

    _POSITIVO_RE = r"positiv[ao]|postiv[ao]|positi[bv][ao]|\+{1,3}|activ[ao]|present[e]"
    _NEGATIVO_RE = r"negativ[ao]|negatv[ao]|\bausente\b|inactiv[ao]"

    _ESTADISTICO_RE = [
        r"\bcuántas?\b", r"\bcuantas?\b",
        r"\bcuántos?\b", r"\bcuantos?\b",
        r"\bqué\s+porcentaje\b", r"\bque\s+porcentaje\b",
        r"\btodas?\s+las?\b", r"\btodos?\s+los?\b",
        r"\benumera\b", r"\blista[r]?\b",
        r"\bmuéstrame\b", r"\bmuestrame\b",
        r"\bconteo\b", r"\bcuál\s+es\s+el\s+(?:total|número)\b",
        r"\bcual\s+es\s+el\s+(?:total|numero)\b",
        r"\bel\s+total\s+de\b", r"\bdame\s+(?:todas?|todos?|las?|los?)\b",
        r"\bmuestra\s+(?:todas?|todos?)\b",
    ]

    # Campos que nunca se consideran "dinámicos" para matching
    _CAMPOS_BASE = {
        "_id", "id", "embedding", "fecha_creacion", "fecha_actualizacion",
        "cepa", "codigo_lab", "origen", "latitud", "longitud",
        "gram", "morfologia_1", "morfologia_2", "pigmentacion",
        "temp_5c", "temp_25c", "temp_37c",
        "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa",
        "catalasa", "celulasa", "fosfatasa", "aia",
        "amp", "ctx", "cxm", "caz", "ak", "c", "te", "am_ecoli", "am_saureus",
    }

    def __init__(self) -> None:
        self._campos_dinamicos: list[str] = []

    def set_campos_dinamicos(self, todos_los_campos: list[str]) -> None:
        """Registra los campos dinámicos descubiertos en MongoDB."""
        self._campos_dinamicos = [
            c for c in todos_los_campos if c not in self._CAMPOS_BASE
        ]
        logger.debug(
            f"📋 Parser: campos dinámicos disponibles ({len(self._campos_dinamicos)}): "
            f"{self._campos_dinamicos}"
        )

    # ------------------------------------------------------------------
    # Método principal
    # ------------------------------------------------------------------

    def parse(self, pregunta: str) -> ParsedQuery:
        texto = pregunta.lower()
        filtros: dict[str, Any] = {}
        terminos: list[str] = []

        logger.debug(f"🔍 QueryParser — pregunta: '{pregunta}'")

        self._parse_gram(texto, filtros, terminos)
        self._parse_tests(texto, filtros, terminos)
        self._parse_antibioticos(texto, filtros, terminos)
        self._parse_temperaturas(texto, filtros, terminos)
        self._parse_origen(pregunta, filtros, terminos)
        self._parse_campos_dinamicos(texto, filtros, terminos)

        es_estadistico = any(re.search(p, texto) for p in self._ESTADISTICO_RE)

        if filtros and es_estadistico:
            modo = "estadístico"
        elif filtros:
            modo = "híbrido"
        else:
            modo = "semántico"

        logger.debug(f"   → filtros:    {filtros}")
        logger.debug(f"   → términos:   {terminos}")
        logger.debug(f"   → estadístico: {es_estadistico}")
        logger.debug(f"   → modo final: {modo}")

        return ParsedQuery(
            filtros=filtros,
            modo=modo,
            terminos_detectados=terminos,
            es_estadistico=es_estadistico,
        )

    # ------------------------------------------------------------------
    # Parsers individuales
    # ------------------------------------------------------------------

    def _parse_gram(
        self, texto: str, filtros: dict, terminos: list
    ) -> None:
        for patron in self._GRAM_POSITIVO:
            if re.search(patron, texto):
                filtros["gram"] = "+"
                terminos.append("gram:positiva(+)")
                logger.debug("   ✓ Gram positiva detectada")
                return
        for patron in self._GRAM_NEGATIVO:
            if re.search(patron, texto):
                filtros["gram"] = "-"
                terminos.append("gram:negativa(-)")
                logger.debug("   ✓ Gram negativa detectada")
                return

    def _parse_tests(
        self, texto: str, filtros: dict, terminos: list
    ) -> None:
        for test in self._TESTS:
            if test not in texto:
                continue
            if re.search(self._POSITIVO_RE, texto):
                filtros[test] = {"$in": ["+", "++", "+++"]}
                terminos.append(f"{test}:positivo")
                logger.debug(f"   ✓ Test {test} positivo")
            elif re.search(self._NEGATIVO_RE, texto):
                filtros[test] = "-"
                terminos.append(f"{test}:negativo")
                logger.debug(f"   ✓ Test {test} negativo")
            else:
                # Solo mencionado, sin valor → filtrar por existencia
                filtros[test] = {"$exists": True, "$ne": None}
                terminos.append(f"{test}:mencionado")
                logger.debug(f"   ✓ Test {test} mencionado (sin valor)")

    def _parse_antibioticos(
        self, texto: str, filtros: dict, terminos: list
    ) -> None:
        for nombre, campo in self._ANTIBIOTICOS.items():
            if nombre not in texto:
                continue
            if re.search(r"\bresistente", texto):
                filtros[campo] = "R"
                terminos.append(f"{campo}:resistente")
                logger.debug(f"   ✓ {nombre} resistente")
            elif re.search(r"\bsensible", texto):
                filtros[campo] = "S"
                terminos.append(f"{campo}:sensible")
                logger.debug(f"   ✓ {nombre} sensible")
            elif re.search(r"\bintermedio", texto):
                filtros[campo] = "I"
                terminos.append(f"{campo}:intermedio")
                logger.debug(f"   ✓ {nombre} intermedio")

    def _parse_temperaturas(
        self, texto: str, filtros: dict, terminos: list
    ) -> None:
        temp_map = {"5": "temp_5c", "25": "temp_25c", "37": "temp_37c"}
        crece_re = self._POSITIVO_RE + r"|crece|crecimiento"
        no_crece_re = self._NEGATIVO_RE + r"|no\s+crece"

        for temp_val, campo in temp_map.items():
            if not re.search(rf"\b{temp_val}\s*°?\s*c\b", texto):
                continue
            if re.search(crece_re, texto):
                filtros[campo] = {"$in": ["+", "++"]}
                terminos.append(f"{campo}:crece")
                logger.debug(f"   ✓ Temperatura {temp_val}°C con crecimiento")
            elif re.search(no_crece_re, texto):
                filtros[campo] = "-"
                terminos.append(f"{campo}:no_crece")
                logger.debug(f"   ✓ Temperatura {temp_val}°C sin crecimiento")

    def _parse_origen(
        self, pregunta: str, filtros: dict, terminos: list
    ) -> None:
        """Detecta lugares/nombres después de preposiciones de origen."""
        patron = (
            r"(?:de|desde|origen|proveniente\s+de|aislad[ao]\s+(?:en|de))"
            r"\s+([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-záéíóúñ\s]{2,40}?)(?:\s|$|,|\.)"
        )
        match = re.search(patron, pregunta)
        if match:
            lugar = match.group(1).strip()
            filtros["origen"] = {"$regex": lugar, "$options": "i"}
            terminos.append(f"origen:{lugar}")
            logger.debug(f"   ✓ Origen detectado: '{lugar}'")

    def _parse_campos_dinamicos(
        self, texto: str, filtros: dict, terminos: list
    ) -> None:
        """Busca coincidencias entre la pregunta y los campos dinámicos de la colección."""
        for campo in self._campos_dinamicos:
            campo_legible = campo.replace("_", " ").lower()
            if campo_legible not in texto and campo.lower() not in texto:
                continue
            if re.search(self._POSITIVO_RE, texto):
                filtros[campo] = {"$in": ["+", "++", "+++", "si", "sí", "yes", "positivo"]}
                terminos.append(f"dinamico:{campo}:positivo")
                logger.debug(f"   ✓ Campo dinámico detectado: '{campo}' → positivo")
            elif re.search(self._NEGATIVO_RE, texto):
                filtros[campo] = {"$in": ["-", "no", "negativo", "ausente"]}
                terminos.append(f"dinamico:{campo}:negativo")
                logger.debug(f"   ✓ Campo dinámico detectado: '{campo}' → negativo")
            else:
                filtros[campo] = {"$exists": True, "$ne": None}
                terminos.append(f"dinamico:{campo}")
                logger.debug(f"   ✓ Campo dinámico detectado: '{campo}' → existencia")


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_parser_instance: QueryParserService | None = None


def get_query_parser() -> QueryParserService:
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = QueryParserService()
    return _parser_instance
