// src/features/dashboard/pieChart/components/PieData.tsx
// Paleta sincronizada con BIO_COLORS de PieChart.tsx y DOT_COLORS del sidebar.

import type { Cepa } from "../../../../shared/interfaces"
import type { PieDataItem } from "../../../../shared/interfaces/index_charts"
import { resolveAlias } from "../../../../shared/utils/labelNormalize"

const BIO_COLORS: string[] = [
  "#00e5b4", "#4d9fff", "#ff8c42", "#a78bfa", "#ff4d6d",
  "#00c4a0", "#3a8aff", "#ffb347", "#c084fc", "#ff6b8a",
  "#00a888", "#2878dd", "#ff9830", "#9060e0", "#ff5277",
  "#1de9b6", "#29b6f6", "#ffa726", "#ab47bc", "#ef5350",
  "#26c6da", "#66bb6a", "#ffca28", "#8d6e63", "#78909c",
]

// Fallback para etiquetas que excedan la paleta predefinida
const generateBioColor = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  // Usa hues del rango teal-cian-verde para mantenerse coherente con el tema
  const h = ((hash * 137.508) % 120 + 160 + 360) % 360   // rango 160–280
  const s = 60 + (Math.abs(hash) % 20)
  const l = 52 + (Math.abs(hash) % 12)
  return `hsl(${h}, ${s}%, ${l}%)`
}

export const processDataForPieChart = (
  rawData: Cepa[],
  column: { field: string; name: string }
): PieDataItem[] => {
  if (!rawData?.length || !column?.field) return []

  const counts: Record<string, number> = {}
  const originalCaseMap: Record<string, string> = {}

  for (const row of rawData) {
    const raw = row[column.field as keyof Cepa]
    const valueAsString = raw !== null && raw !== undefined ? String(raw) : "N/I"
    const canonicalKey = resolveAlias(valueAsString.toLowerCase())

    if (!originalCaseMap[canonicalKey]) {
      originalCaseMap[canonicalKey] = canonicalKey.charAt(0).toUpperCase() + canonicalKey.slice(1)
    }
    counts[canonicalKey] = (counts[canonicalKey] ?? 0) + 1
  }

  const uniqueLabels = Object.values(originalCaseMap)
  const colorMap: Record<string, string> = {}
  uniqueLabels.forEach((label, index) => {
    colorMap[label] =
      index < BIO_COLORS.length
        ? BIO_COLORS[index]
        : generateBioColor(label)
  })

  return Object.entries(counts).map(([canonicalKey, count]) => {
    const label = originalCaseMap[canonicalKey]
    return {
      id: label,
      label,
      value: count,
      color: colorMap[label],
    }
  })
}
