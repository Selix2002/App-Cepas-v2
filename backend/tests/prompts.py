# tests/prompts.py
# Prompts organizados por modo esperado para evaluar el sistema de búsqueda híbrida.

PROMPTS = [
    # ── Estadístico ─────────────────────────────────────────────────────────
    {
        "pregunta": "¿Cuántas cepas son Gram positivas?",
        "modo_esperado": "estadístico",
    },
    {
        "pregunta": "¿Cuántas cepas tienen lecitinasa positiva?",
        "modo_esperado": "estadístico",
    },
    {
        "pregunta": "¿Cuántas cepas son resistentes a ampicilina?",
        "modo_esperado": "estadístico",
    },
    {
        "pregunta": "¿Cuál es el total de cepas que crecen a 37°C?",
        "modo_esperado": "estadístico",
    },

    # ── Híbrido ──────────────────────────────────────────────────────────────
    {
        "pregunta": "Dame las cepas Gram positivas con mayor actividad enzimática",
        "modo_esperado": "híbrido",
    },
    {
        "pregunta": "¿Qué cepas Gram negativas tienen proteasa positiva?",
        "modo_esperado": "híbrido",
    },
    {
        "pregunta": "Muéstrame las cepas resistentes a tetraciclina con sus características",
        "modo_esperado": "híbrido",
    },

    # ── Semántico ────────────────────────────────────────────────────────────
    {
        "pregunta": "¿Qué cepa recomendarías para biorremediación de suelos?",
        "modo_esperado": "semántico",
    },
    {
        "pregunta": "¿Cuál de las cepas tiene mejor potencial como biofertilizante?",
        "modo_esperado": "semántico",
    },
    {
        "pregunta": "Describe las cepas con mayor versatilidad metabólica",
        "modo_esperado": "semántico",
    },

    # ── Casos límite ─────────────────────────────────────────────────────────
    {
        "pregunta": "¿Cuántas cepas hay en total?",
        "modo_esperado": "estadístico",
    },
    {
        "pregunta": "¿Qué significa Gram positiva?",
        "modo_esperado": "semántico",  # conceptual, no debería filtrar en DB
    },
]
