// src/features/cepas/hooks/charts/useCepasCharts.ts
// Sin ninguna dependencia de ag-grid.
import { useState, useMemo, useEffect, useCallback } from "react"
import { processDataForBarChart } from "../../../dashboard/barChart/components/barData"
import { processDataForPieChart } from "../../../dashboard/pieChart/components/PieData"
import type { Cepa } from "../../../../shared/interfaces"

export type ChartType = "pie" | "bar"
export type ColumnSelection = { field: string; name: string }
export type BarDataset = {
  data: Array<Record<string, number | string>>
  keys: string[]
  indexBy: string
}

type Params = {
  filteredData: Cepa[]  // ya filtrado — viene de useCepasTableCore
}

export function useCepasCharts({ filteredData }: Params) {
  const [chartType, setChartType] = useState<ChartType>("pie")
  const [selectedColumns, setSelectedColumns] = useState<ColumnSelection[]>([])

  const selectedColumn = selectedColumns[0] ?? null

  const handleColumnToggle = useCallback(
    (selection: ColumnSelection, checked: boolean) => {
      setSelectedColumns((prev) => {
        if (!checked) return prev.filter((c) => c.field !== selection.field)
        if (chartType === "pie") return [selection]
        if (prev.some((c) => c.field === selection.field)) return prev
        if (prev.length < 2) return [...prev, selection]
        return [prev[1], selection]
      })
    },
    [chartType]
  )

  // Recortar selección al cambiar tipo de gráfico
  useEffect(() => {
    setSelectedColumns((prev) =>
      chartType === "pie" ? prev.slice(0, 1) : prev.slice(0, 2)
    )
  }, [chartType])

  const pieChartData = useMemo(() => {
    if (!selectedColumn) return []
    return processDataForPieChart(filteredData, selectedColumn)
  }, [filteredData, selectedColumn])

  const barDataset = useMemo((): BarDataset | null => {
    if (chartType !== "bar" || selectedColumns.length < 2) return null
    return processDataForBarChart(filteredData, selectedColumns[0], selectedColumns[1])
  }, [chartType, selectedColumns, filteredData])

  return {
    chartType,
    setChartType,
    selectedColumns,
    selectedColumn,
    handleColumnToggle,
    barDataset,
    pieChartData,
  }
}
