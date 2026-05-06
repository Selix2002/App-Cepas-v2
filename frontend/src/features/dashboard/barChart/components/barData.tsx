// src/components/barChart/barData.tsx

import type { Cepa } from "../../../../shared/interfaces"
import { toDisplayLabel } from "../../../../shared/utils/labelNormalize"

export type ColSel = { field: string; name: string }

export type BarChartResult = {
  data: Array<Record<string, number | string>>
  keys: string[]
  indexBy: string
}

export function processDataForBarChart(
  rows: Cepa[],
  firstCol: ColSel,
  secondCol: ColSel
): BarChartResult {
  const matrix = new Map<string, Map<string, number>>()
  const allSeries = new Set<string>()

  for (const row of rows ?? []) {
    // Acceso directo al campo plano — no más notación de puntos
    const rawX = row[firstCol.field as keyof Cepa]
    const rawS = row[secondCol.field as keyof Cepa]
    const x = toDisplayLabel(rawX)
    const s = toDisplayLabel(rawS)

    allSeries.add(s)
    if (!matrix.has(x)) matrix.set(x, new Map())
    const inner = matrix.get(x)!
    inner.set(s, (inner.get(s) ?? 0) + 1)
  }

  const xValues = Array.from(matrix.keys()).sort((a, b) => a.localeCompare(b))

  const seriesTotals = new Map<string, number>()
  for (const [, bySerie] of matrix) {
    for (const [serie, cnt] of bySerie) {
      seriesTotals.set(serie, (seriesTotals.get(serie) ?? 0) + cnt)
    }
  }

  const keys = Array.from(allSeries).sort((a, b) => {
    const da = seriesTotals.get(a) ?? 0
    const db = seriesTotals.get(b) ?? 0
    return db - da || a.localeCompare(b)
  })

  const data = xValues.map((x) => {
    const bySerie = matrix.get(x)!
    const entry: Record<string, number | string> = { x }
    for (const k of keys) {
      entry[k] = bySerie.get(k) ?? 0
    }
    return entry
  })

  return { data, keys, indexBy: "x" }
}