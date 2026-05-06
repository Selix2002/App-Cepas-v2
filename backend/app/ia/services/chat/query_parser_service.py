# app/ia/services/chat/query_parser_service.py

import re
import time
import logging
from dataclasses import dataclass, field
from datetime import datetime
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

    # -- Campos estáticos comentados al migrar a modelo dinámico (2026-05-01) --
    # Reactivar si se vuelven a usar campos fijos de dominio biológico.

    # # Gram
    # _GRAM_POSITIVO = [r"\bgram\s*\+", r"\bgram\s*positiv", r"\bgrampositiv"]
    # _GRAM_NEGATIVO = [r"\bgram\s*-", r"\bgram\s*negativ", r"\bgramnegativ"]

    # # Tests enzimáticos fijos
    # _TESTS = [
    #     "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa",
    #     "catalasa", "celulasa", "fosfatasa", "aia",
    # ]

    # # Antibióticos: nombre legible → campo en modelo
    # _ANTIBIOTICOS = {
    #     "ampicilina": "amp",
    #     "cefotaxima": "ctx",
    #     "cefuroxima": "cxm",
    #     "ceftazidima": "caz",
    #     "amikacina": "ak",
    #     "cloranfenicol": "c",
    #     "tetraciclina": "te",
    # }

    # Usados por _parse_campos_dinamicos — se mantienen activos
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
    # Solo contiene los campos fijos del nuevo modelo dinámico
    _CAMPOS_BASE = {
        "_id", "id", "embedding", "fecha_creacion", "fecha_actualizacion",
        "cepa", "latitud", "longitud",
        "envio_punta_arenas",  # manejado por _parse_envio_punta_arenas
        # -- Campos estáticos del modelo anterior (comentados al migrar a modelo dinámico) --
        # "codigo_lab", "origen", "gram", "morfologia_1", "morfologia_2", "pigmentacion",
        # "temp_5c", "temp_25c", "temp_37c",
        # "lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa",
        # "catalasa", "celulasa", "fosfatasa", "aia",
        # "amp", "ctx", "cxm", "caz", "ak", "c", "te", "am_ecoli", "am_saureus",
    }

    # Meses en español → número
    _MESES_ES: dict[str, int] = {
        "enero": 1, "ene": 1,
        "febrero": 2, "feb": 2,
        "marzo": 3, "mar": 3,
        "abril": 4, "abr": 4,
        "mayo": 5, "may": 5,
        "junio": 6, "jun": 6,
        "julio": 7, "jul": 7,
        "agosto": 8, "ago": 8,
        "septiembre": 9, "sep": 9,
        "octubre": 10, "oct": 10,
        "noviembre": 11, "nov": 11,
        "diciembre": 12, "dic": 12,
    }

    # Palabras clave que activan el parser de envio_punta_arenas
    _ENVIO_KEYWORDS = [
        "punta arenas", "puntarenas", "envio", "envío", "enviada", "enviadas",
        "enviaron", "enviar",
    ]

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

        # Parsers de campos estáticos desactivados al migrar a modelo dinámico (2026-05-01)
        # self._parse_gram(texto, filtros, terminos)
        # self._parse_tests(texto, filtros, terminos)
        # self._parse_antibioticos(texto, filtros, terminos)
        # self._parse_temperaturas(texto, filtros, terminos)
        # self._parse_origen(pregunta, filtros, terminos)

        self._parse_envio_punta_arenas(texto, filtros, terminos)
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

    # -- Métodos de parseo de campos estáticos (comentados al migrar a modelo dinámico) --
    # Reactivar junto con las llamadas en parse() y las class variables correspondientes.

    # def _parse_gram(self, texto, filtros, terminos):
    #     for patron in self._GRAM_POSITIVO:
    #         if re.search(patron, texto):
    #             filtros["gram"] = "+"
    #             terminos.append("gram:positiva(+)")
    #             return
    #     for patron in self._GRAM_NEGATIVO:
    #         if re.search(patron, texto):
    #             filtros["gram"] = "-"
    #             terminos.append("gram:negativa(-)")
    #             return

    # def _parse_tests(self, texto, filtros, terminos):
    #     for test in self._TESTS:
    #         if test not in texto:
    #             continue
    #         if re.search(self._POSITIVO_RE, texto):
    #             filtros[test] = {"$in": ["+", "++", "+++"]}
    #             terminos.append(f"{test}:positivo")
    #         elif re.search(self._NEGATIVO_RE, texto):
    #             filtros[test] = "-"
    #             terminos.append(f"{test}:negativo")
    #         else:
    #             filtros[test] = {"$exists": True, "$ne": None}
    #             terminos.append(f"{test}:mencionado")

    # def _parse_antibioticos(self, texto, filtros, terminos):
    #     for nombre, campo in self._ANTIBIOTICOS.items():
    #         if nombre not in texto:
    #             continue
    #         if re.search(r"\bresistente", texto):
    #             filtros[campo] = "R"
    #             terminos.append(f"{campo}:resistente")
    #         elif re.search(r"\bsensible", texto):
    #             filtros[campo] = "S"
    #             terminos.append(f"{campo}:sensible")
    #         elif re.search(r"\bintermedio", texto):
    #             filtros[campo] = "I"
    #             terminos.append(f"{campo}:intermedio")

    # def _parse_temperaturas(self, texto, filtros, terminos):
    #     temp_map = {"5": "temp_5c", "25": "temp_25c", "37": "temp_37c"}
    #     crece_re = self._POSITIVO_RE + r"|crece|crecimiento"
    #     no_crece_re = self._NEGATIVO_RE + r"|no\s+crece"
    #     for temp_val, campo in temp_map.items():
    #         if not re.search(rf"\b{temp_val}\s*°?\s*c\b", texto):
    #             continue
    #         if re.search(crece_re, texto):
    #             filtros[campo] = {"$in": ["+", "++"]}
    #             terminos.append(f"{campo}:crece")
    #         elif re.search(no_crece_re, texto):
    #             filtros[campo] = "-"
    #             terminos.append(f"{campo}:no_crece")

    # def _parse_origen(self, pregunta, filtros, terminos):
    #     patron = (
    #         r"(?:de|desde|origen|proveniente\s+de|aislad[ao]\s+(?:en|de))"
    #         r"\s+([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-záéíóúñ\s]{2,40}?)(?:\s|$|,|\.)"
    #     )
    #     match = re.search(patron, pregunta)
    #     if match:
    #         lugar = match.group(1).strip()
    #         filtros["origen"] = {"$regex": re.escape(lugar), "$options": "i"}
    #         terminos.append(f"origen:{lugar}")

    def _parse_envio_punta_arenas(
        self, texto: str, filtros: dict, terminos: list
    ) -> None:
        """Detecta filtros de fecha sobre envio_punta_arenas."""
        if not any(kw in texto for kw in self._ENVIO_KEYWORDS):
            return

        # Construir patrón de meses
        meses_patron = "|".join(self._MESES_ES.keys())

        # Detectar año explícito (ej: "2024"); fallback al año actual (B7)
        year_match = re.search(r"\b(20\d{2})\b", texto)
        year = int(year_match.group(1)) if year_match else datetime.now().year

        # Rangos: "entre X y Y"
        rango_re = (
            rf"entre\s+(?:el\s+)?(\d{{1,2}})\s+de\s+({meses_patron})"
            rf"\s+y\s+(?:el\s+)?(\d{{1,2}})\s+de\s+({meses_patron})"
        )
        m = re.search(rango_re, texto)
        if m:
            d1, mes1, d2, mes2 = int(m.group(1)), m.group(2), int(m.group(3)), m.group(4)
            try:
                desde = datetime(year, self._MESES_ES[mes1], d1)
                hasta = datetime(year, self._MESES_ES[mes2], d2, 23, 59, 59)
                filtros["envio_punta_arenas"] = {"$gte": desde, "$lte": hasta}
                terminos.append(f"envio_punta_arenas:rango:{desde.date()}/{hasta.date()}")
                logger.debug(f"   ✓ Envío Punta Arenas entre {desde.date()} y {hasta.date()}")
                return
            except (ValueError, KeyError):
                pass

        # "después de" / "a partir de"
        despues_re = (
            rf"(?:despu[eé]s\s+de|a\s+partir\s+de)\s+(?:el\s+)?(\d{{1,2}})?\s*(?:de\s+)?({meses_patron})"
        )
        m = re.search(despues_re, texto)
        if m:
            dia = int(m.group(1)) if m.group(1) else 1
            mes = m.group(2)
            try:
                desde = datetime(year, self._MESES_ES[mes], dia)
                filtros["envio_punta_arenas"] = {"$gte": desde}
                terminos.append(f"envio_punta_arenas:desde:{desde.date()}")
                logger.debug(f"   ✓ Envío Punta Arenas desde {desde.date()}")
                return
            except (ValueError, KeyError):
                pass

        # "antes de"
        antes_re = (
            rf"antes\s+de\s+(?:el\s+)?(\d{{1,2}})?\s*(?:de\s+)?({meses_patron})"
        )
        m = re.search(antes_re, texto)
        if m:
            dia = int(m.group(1)) if m.group(1) else 28
            mes = m.group(2)
            try:
                hasta = datetime(year, self._MESES_ES[mes], dia, 23, 59, 59)
                filtros["envio_punta_arenas"] = {"$lte": hasta}
                terminos.append(f"envio_punta_arenas:hasta:{hasta.date()}")
                logger.debug(f"   ✓ Envío Punta Arenas hasta {hasta.date()}")
                return
            except (ValueError, KeyError):
                pass

        # Solo menciona envío sin rango → filtrar por existencia
        filtros["envio_punta_arenas"] = {"$exists": True, "$ne": None}
        terminos.append("envio_punta_arenas:existe")
        logger.debug("   ✓ Envío Punta Arenas mencionado (sin rango de fecha)")

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
