import type { Cepa } from "../../../../shared/interfaces"
import type { PieDataItem } from "../../../../shared/interfaces/index_charts"

const PREDEFINED_COLORS: string[] = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
  "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5",
  "#393b79", "#637939", "#8c6d31", "#843c39", "#7b4173",
]

const generateHSLColorFromString = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  const h = (hash * 137.508) % 360
  const hue = ((h % 360) + 360) % 360
  const saturation = 60 + (hash % 11) * 2
  const lightness = 45 + (hash % 11)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export const processDataForPieChart = (
  rawData: Cepa[],
  column: { field: string; name: string }
): PieDataItem[] => {
  if (!rawData || rawData.length === 0 || !column?.field) return []

  const counts: Record<string, number> = {}
  const originalCaseMap: Record<string, string> = {}

  for (const row of rawData) {
    // Acceso directo al campo plano — sin getValueByPath
    const raw = row[column.field as keyof Cepa]
    const valueAsString = raw !== null && raw !== undefined ? String(raw) : "N/I"
    const lowerKey = valueAsString.toLowerCase()

    if (!originalCaseMap[lowerKey]) {
      originalCaseMap[lowerKey] = valueAsString
    }
    counts[lowerKey] = (counts[lowerKey] ?? 0) + 1
  }

  const uniqueLabels = Object.values(originalCaseMap)
  const colorMap: Record<string, string> = {}
  uniqueLabels.forEach((label, index) => {
    colorMap[label] =
      index < PREDEFINED_COLORS.length
        ? PREDEFINED_COLORS[index]
        : generateHSLColorFromString(label)
  })

  return Object.entries(counts).map(([lowerKey, count]) => {
    const label = originalCaseMap[lowerKey]
    return {
      id: label,
      label,
      value: count,
      color: colorMap[label],
    }
  })
}