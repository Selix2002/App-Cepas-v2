// Aliases de etiquetas: variante (minúsculas) → forma canónica (minúsculas)
const LABEL_ALIASES: Record<string, string> = {
  "planta l. amarga": "planta laguna amarga",
  "laguna amarga":    "planta laguna amarga",
}

/** Devuelve la clave canónica (minúsculas) para agrupar en gráficos. */
export function resolveAlias(lower: string): string {
  return LABEL_ALIASES[lower] ?? lower
}

/** Convierte un valor raw a etiqueta de display: alias resuelto + primera letra mayúscula. */
export function toDisplayLabel(v: unknown): string {
  if (v === null || v === undefined) return "N/I"
  const s = String(v).trim()
  if (!s.length) return "N/I"
  const canonical = resolveAlias(s.toLowerCase())
  return canonical.charAt(0).toUpperCase() + canonical.slice(1)
}
