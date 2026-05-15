// src/features/cepas/components/CepasColumns.tsx
import type { CepaColumnDef } from "../types/tableTypes"

// Campos que nunca se muestran como columnas de usuario
const INTERNAL_FIELDS = new Set([
  "id", "fecha_creacion", "fecha_actualizacion", "embedding",
])

// Columnas fijas del modelo — siempre aparecen primero
const FIXED_COLUMN_DEFS: CepaColumnDef[] = [
  { field: "cepa",               headerName: "Cepa",              pinned: true, width: 140, type: "text" },
  { field: "latitud",            headerName: "Latitud",            width: 100,  type: "number" },
  { field: "longitud",           headerName: "Longitud",           width: 100,  type: "number" },
  { field: "envio_punta_arenas", headerName: "Envío Pta. Arenas", width: 160,  type: "date" },
]

const FIXED_FIELDS = new Set(FIXED_COLUMN_DEFS.map((c) => c.field))

/** Convierte un nombre de campo a un header legible. */
function fieldToHeader(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Columnas fijas sin extras — úsala cuando no hay datos cargados. */
export const getCepasColumnDefs = (): CepaColumnDef[] => [...FIXED_COLUMN_DEFS]

/**
 * Columnas fijas + columnas dinámicas descubiertas desde los datos.
 * Los campos dinámicos se ordenan alfabéticamente tras los fijos.
 * `labels` es el mapa field→header original del backend (opcional).
 */
export const getCepasColumnDefsWithExtras = (
  data: Record<string, unknown>[],
  labels: Record<string, string> = {}
): CepaColumnDef[] => {
  const extraKeys = Array.from(
    new Set(
      data.flatMap((row) =>
        Object.keys(row).filter((k) => !FIXED_FIELDS.has(k) && !INTERNAL_FIELDS.has(k))
      )
    )
  ).sort()

  const extras: CepaColumnDef[] = extraKeys.map((k) => ({
    field: k,
    headerName: labels[k] ?? fieldToHeader(k),
    width: 130,
    type: "text",
  }))

  return [...FIXED_COLUMN_DEFS, ...extras]
}
