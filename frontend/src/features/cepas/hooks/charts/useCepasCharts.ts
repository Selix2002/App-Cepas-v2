// src/features/cepas/hooks/useCepasCharts.ts
import { useState, useMemo, useEffect, useCallback } from "react"
import type { GridApi } from "ag-grid-community"
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

type UseCepasChartsParams = {
    gridApi?: GridApi
    rawTableData: Cepa[]
    filterVersion: number
}

export function useCepasCharts({
    gridApi,
    rawTableData,
    filterVersion,
}: UseCepasChartsParams) {
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

    const getFilteredRows = (): Cepa[] => {
        if (!gridApi) return rawTableData
        const rows: Cepa[] = []
        if (gridApi.isAnyFilterPresent()) {
            gridApi.forEachNodeAfterFilter((n) => rows.push(n.data))
        } else {
            gridApi.forEachNode((n) => rows.push(n.data))
        }
        return rows
    }

    const barDataset = useMemo((): BarDataset | null => {
        if (chartType !== "bar" || selectedColumns.length < 2 || !gridApi) return null
        const rows = getFilteredRows()
        return processDataForBarChart(rows, selectedColumns[0], selectedColumns[1])
    }, [chartType, selectedColumns, gridApi, filterVersion]) // eslint-disable-line react-hooks/exhaustive-deps

    const pieChartData = useMemo(() => {
        if (!selectedColumn) return []
        const rows = getFilteredRows()
        return processDataForPieChart(rows, selectedColumn)
    }, [rawTableData, selectedColumn, gridApi, filterVersion]) // eslint-disable-line react-hooks/exhaustive-deps

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