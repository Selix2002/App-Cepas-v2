// src/features/cepas/hooks/useCepasCharts.ts
import { useState, useMemo, useEffect, useCallback } from "react";
import type { GridApi } from "ag-grid-community";
import { processDataForBarChart } from "../../../dashboard/barChart/components/barData";
import { processDataForPieChart } from "../../../dashboard/pieChart/components/PieData";

export type ChartType = "pie" | "bar";

export type ColumnSelection = { field: string; name: string };

export type BarDataset = {
    data: any[];
    keys: string[];
    indexBy: string;
};

type UseCepasChartsParams = {
    gridApi?: GridApi;
    rawTableData: any[];
    filterVersion: number;
};

export function useCepasCharts({
    gridApi,
    rawTableData,
    filterVersion,
}: UseCepasChartsParams) {
    const [chartType, setChartType] = useState<ChartType>("pie");
    const [selectedColumns, setSelectedColumns] = useState<ColumnSelection[]>([]);

    const selectedColumn = selectedColumns[0] ?? null;

    // Manejar selección/deselección de columnas desde la tabla
    const handleColumnToggle = useCallback(
        (selection: ColumnSelection, checked: boolean) => {
            setSelectedColumns((prev) => {
                // Deselección
                if (!checked) return prev.filter((c) => c.field !== selection.field);

                if (chartType === "pie") {
                    // Pie: siempre 1 sola
                    return [selection];
                }

                // Bar: hasta 2 columnas, manteniendo orden (prev[0] = más antigua)
                if (prev.some((c) => c.field === selection.field)) return prev;

                if (prev.length < 2) {
                    return [...prev, selection];
                }

                // prev.length === 2 → quitar la más antigua y agregar la nueva
                return [prev[1], selection];
            });
        },
        [chartType]
    );

    // Dataset para gráfico de barras
    const barDataset = useMemo(() => {
        if (chartType !== "bar" || selectedColumns.length < 2 || !gridApi) {
            return null;
        }

        const rows: any[] = [];

        if (gridApi.isAnyFilterPresent()) {
            gridApi.forEachNodeAfterFilter((n) => rows.push(n.data));
        } else {
            gridApi.forEachNode((n) => rows.push(n.data));
        }

        const [firstCol, secondCol] = selectedColumns;
        const result = processDataForBarChart(rows, firstCol, secondCol);

        console.log("[useCepasCharts] Nivo Bar dataset listo →", result);
        return result;
    }, [chartType, selectedColumns, gridApi, filterVersion]);

    // Si cambia el tipo de gráfico, recortar la selección
    useEffect(() => {
        setSelectedColumns((prev) =>
            chartType === "pie" ? prev.slice(0, 1) : prev.slice(0, 2)
        );
    }, [chartType]);

    // Log opcional cuando hay 2 columnas para bar
    useEffect(() => {
        if (chartType === "bar" && selectedColumns.length === 2) {
            console.log(
                "[useCepasCharts] Barchart: columnas seleccionadas para cruce →",
                { columns: selectedColumns }
            );
        }
    }, [chartType, selectedColumns]);

    // Dataset para gráfico de torta
    const pieChartData = useMemo(() => {
        if (!selectedColumn) return [];

        if (gridApi && gridApi.isAnyFilterPresent()) {
            const filteredData: any[] = [];
            gridApi.forEachNodeAfterFilter((node) => filteredData.push(node.data));
            return processDataForPieChart(filteredData, selectedColumn);
        }

        return processDataForPieChart(rawTableData, selectedColumn);
    }, [rawTableData, selectedColumn, gridApi, filterVersion]);

    return {
        chartType,
        setChartType,
        selectedColumns,
        selectedColumn,
        handleColumnToggle,
        barDataset,
        pieChartData,
    };
}
