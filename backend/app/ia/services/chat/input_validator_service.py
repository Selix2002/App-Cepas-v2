# app/ia/services/chat/input_validator_service.py

import asyncio
import re
import logging
import unicodedata
from dataclasses import dataclass

from app.ia.services.chat.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Normalización unicode para los chequeos de regex (S12)
# ---------------------------------------------------------------------------

def _normalize_for_checks(texto: str) -> str:
    """Normaliza el texto antes de los regex de inyección/off-topic para evitar
    evasiones unicode triviales (fullwidth, zero-width, acentos de evasión).

    Solo se usa para los chequeos por patrón; la similitud semántica se calcula
    sobre el texto original. No cubre homoglyphs de otro script (p.ej. cirílico);
    para eso el backstop es el SECURITY_PREAMBLE del LLM.
    """
    # NFKC: pliega fullwidth/compatibilidad (ｉｇｎｏｒａ → ignora)
    t = unicodedata.normalize("NFKC", texto)
    # quita caracteres de formato/ancho cero (Cf): ig​nora → ignora
    t = "".join(c for c in t if unicodedata.category(c) != "Cf")
    # quita acentos combinados (ignòra/actûa → ignora/actua); los patrones ya toleran ambos
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    # colapsa cualquier espacio unicode y baja a minúsculas
    return re.sub(r"\s+", " ", t).lower().strip()

# ---------------------------------------------------------------------------
# Resultado de validación
# ---------------------------------------------------------------------------

@dataclass
class ValidationResult:
    is_valid: bool
    reason: str    # "ok" | "injection" | "off_topic" | "invalid_input"
    detail: str    # para logs de auditoría

# ---------------------------------------------------------------------------
# Servicio
# ---------------------------------------------------------------------------

class InputValidatorService:

    # Patrones de prompt injection.
    # NOTA: se matchean contra texto_norm, que ya está en minúsculas (_normalize_for_checks) →
    # estos patrones deben estar en minúsculas (antes "\[INST\]" nunca podía matchear "[inst]").
    _INJECTION_PATTERNS = [
        r"ignora\s+((las|tus|sus|mis|nuestras)\s+)?instrucciones",
        r"olvida\s+(lo\s+)?anterior",
        r"act[uú]a\s+como",
        r"nuevo\s+rol",
        r"modo\s+desarrollador",
        r"\bjailbreak\b",
        r"\bdan\s+mode\b",
        r"<\s*system\s*>",
        r"\[inst\]",
        r"<\|im_start\|>",
        r"<\|im_end\|>",
        r"\bprompt\s*:",
        r"system\s*prompt",
        r"ignora\s+todo",
        r"desactiva\s+(las\s+)?restricciones",
        r"sin\s+restricciones",
        r"no\s+tienes\s+restricciones",
        r"eres\s+(libre|diferente|nuevo)\b",
        r"pretende\s+ser",
        r"haz\s+(como|de\s+cuenta)\s+que",
        r"\bbypass\b",
        r"\boverride\b",
        r"ignora\s+el\s+contexto",
        r"forget\s+(all\s+)?previous",
        r"ignore\s+(all\s+)?instructions",
    ]

    # Blacklist de temas claramente fuera de dominio (guardia rápida pre-embedding)
    _OFF_TOPIC_BLACKLIST = [
        r"\b(segunda|primera)\s+guerra\s+mundial\b",
        r"\bguerra\s+mundial\b",
        r"\b(f[uú]tbol|f[uú]tbol\s+club|deporte|olimpiadas?)\b",
        r"\b(receta\s+de|c[oó]mo\s+cocinar|ingredientes\s+para)\b",
        r"\b(m[uú]sica|canci[oó]n|artista\s+musical|[aá]lbum)\b",
        r"\b(pel[íi]cula|serie\s+de\s+tv|anime|protagonista)\b",
        r"\b(ecuaci[oó]n\s+matem[aá]tica|integral\s+de|derivada\s+de|[aá]lgebra\s+lineal)\b",
        r"\b(resuelve\s+este\s+problema|calcula\s+el\s+resultado)\b",
        r"\b(cu[aá]ndo\s+se\s+fund[oó]|cu[aá]ndo\s+naci[oó]|en\s+qu[eé]\s+a[nñ]o\s+fue)\b",
        r"\b(historia\s+del?\s+(mundo|pa[ií]s|continente))\b",
        r"\b(pol[íi]tica\s+nacional|partido\s+pol[íi]tico|presidente\s+de)\b",
        r"\b(clima\s+(de|en)|temperatura\s+del\s+tiempo|pron[oó]stico\s+del\s+tiempo)\b",
        r"\b(criptomoneda|bitcoin|ethereum|inversi[oó]n\s+financiera)\b",
        r"\b(chiste|cuento|historia\s+de\s+terror|poema)\b",
    ]

    # Frases ancla del dominio para clasificación semántica
    _DOMAIN_ANCHORS = [
        "cepa bacteriana gram positiva negativa microbiología",
        "resistencia antibiótica ampicilina tetraciclina amikacina",
        "prueba bioquímica lecitinasa ureasa lipasa amilasa proteasa catalasa",
        "morfología bacteriana bacilo coco espirilo pigmentación",
        "origen cepa lago laguna muestra aislamiento",
        "temperatura crecimiento bacteriano cultivo 5 25 37 grados",
        "gen 16s identificación especie bacteriana taxonomía",
        "enzima bacteriana actividad enzimática fosfatasa celulasa",
        "colección cepas laboratorio microbiológico análisis",
        "resistencia sensible intermedio antibiótico perfil",
    ]

    def __init__(self) -> None:
        self._embedding_service = get_embedding_service()
        logger.info("🛡️  Cargando anclas semánticas del dominio...")
        self._anchor_embeddings = self._embedding_service.encode_batch(
            self._DOMAIN_ANCHORS, "search_document"
        )
        logger.info(f"✅ InputValidatorService listo ({len(self._DOMAIN_ANCHORS)} anclas)")

    async def validate(self, pregunta: str, domain_threshold: float) -> ValidationResult:
        logger.debug(f"🛡️  Validando input ({len(pregunta)} chars): '{pregunta[:80]}'")

        # S12: texto normalizado (unicode) solo para los chequeos por regex.
        texto_norm = _normalize_for_checks(pregunta)

        # ── 1. Ratio de caracteres especiales (sobre el texto original) ───────
        permitidos = set(" .,;:?!¿¡áéíóúüñÁÉÍÓÚÜÑ-'\"()")
        especiales = sum(1 for c in pregunta if not c.isalnum() and c not in permitidos)
        ratio = especiales / max(len(pregunta), 1)
        if ratio > 0.35:
            logger.warning(f"🛡️  RECHAZADO — ratio caracteres especiales: {ratio:.2f}")
            return ValidationResult(
                is_valid=False, reason="invalid_input",
                detail=f"ratio_especiales={ratio:.2f}"
            )

        # ── 2. Patrones de inyección (sobre texto normalizado) ────────────────
        for pattern in self._INJECTION_PATTERNS:
            if re.search(pattern, texto_norm):
                logger.warning(f"🛡️  RECHAZADO — inyección detectada: '{pattern}'")
                return ValidationResult(
                    is_valid=False, reason="injection",
                    detail=f"pattern='{pattern}'"
                )

        # ── 3. Blacklist off-topic (rápida, antes del embedding) ──────────────
        for pattern in self._OFF_TOPIC_BLACKLIST:
            if re.search(pattern, texto_norm):
                logger.info(f"🛡️  RECHAZADO — off-topic por blacklist: '{pattern}'")
                return ValidationResult(
                    is_valid=False, reason="off_topic",
                    detail=f"blacklist='{pattern}'"
                )

        # ── 4. Similitud semántica con el dominio ─────────────────────────────
        query_embedding = await asyncio.to_thread(
            self._embedding_service.encode, pregunta, "search_query"
        )
        similitudes = [
            self._embedding_service.cosine_similarity(query_embedding, anchor)
            for anchor in self._anchor_embeddings
        ]
        max_sim = max(similitudes)
        mejor_ancla = self._DOMAIN_ANCHORS[similitudes.index(max_sim)]

        logger.debug(
            f"   Similitud dominio: max={max_sim:.4f} | "
            f"threshold={domain_threshold} | ancla='{mejor_ancla[:50]}'"
        )

        if max_sim < domain_threshold:
            logger.info(
                f"🛡️  RECHAZADO — off-topic semántico: "
                f"max_sim={max_sim:.4f} < threshold={domain_threshold}"
            )
            return ValidationResult(
                is_valid=False, reason="off_topic",
                detail=f"max_sim={max_sim:.4f}"
            )

        logger.debug(f"   ✅ Input válido (max_sim={max_sim:.4f})")
        return ValidationResult(is_valid=True, reason="ok", detail=f"max_sim={max_sim:.4f}")


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_validator_instance: InputValidatorService | None = None


def get_input_validator() -> InputValidatorService:
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = InputValidatorService()
    return _validator_instance
