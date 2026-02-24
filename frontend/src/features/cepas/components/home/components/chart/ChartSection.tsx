// src/features/cepas/components/home/ChartSection.tsx
import type { RefObject } from "react";
import MyPieChart from "../../../../../dashboard/pieChart/components/PieChart";
import BarChart from "../../../../../dashboard/barChart/components/barChart";
import type {
    ChartType,
    ColumnSelection,
    BarDataset,
} from "../../../../hooks/charts/useCepasCharts";

type ChartSectionProps = {
    chartRef: RefObject<HTMLDivElement | null>;
    chartType: ChartType;
    setChartType: (type: ChartType) => void;
    selectedColumn: ColumnSelection | null;
    selectedColumns: ColumnSelection[];
    pieChartData: any[];
    barDataset: BarDataset | null;
    canDownload: boolean;
    onOpenDownload: () => void;
};

export default function ChartSection({
    chartRef,
    chartType,
    setChartType,
    selectedColumn,
    selectedColumns,
    pieChartData,
    barDataset,
    canDownload,
    onOpenDownload,
}: ChartSectionProps) {
    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-2">
                Análisis de Columna:{" "}
                <span className="text-blue-400">
                    {selectedColumn?.name || "Ninguna"}
                </span>
            </h2>

            {/* Selector de tipo de gráfico */}
            <div className="mb-3 flex items-center gap-3">
                <label htmlFor="chartType" className="text-sm text-gray-300">
                    Tipo de gráfico:
                </label>
                <select
                    id="chartType"
                    value={chartType}
                    onChange={(e) =>
                        setChartType(e.target.value === "bar" ? "bar" : "pie")
                    }
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1"
                >
                    <option value="pie">Gráfico de torta</option>
                    <option value="bar">Gráfico de barras</option>
                </select>
            </div>

            {/* Contenedor del gráfico (referenciado para la descarga) */}
            <div
                ref={chartRef}
                className="bg-gray-800 p-2 rounded-lg"
                style={{ height: 400 }}
            >
                {chartType === "pie" ? (
                    selectedColumn && pieChartData.length > 0 ? (
                        <MyPieChart data={pieChartData} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <p>Seleccione una columna (máx. 1) para generar un gráfico.</p>
                        </div>
                    )
                ) : chartType === "bar" ? (
                    selectedColumns.length === 2 && barDataset ? (
                        <BarChart
                            data={barDataset.data}
                            keys={barDataset.keys}
                            indexBy={barDataset.indexBy}
                            xLabel={selectedColumns[0].name}
                            yLabel="Cantidad"
                            groupMode="stacked"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <p>Seleccione dos columnas para generar un gráfico de barras.</p>
                        </div>
                    )
                ) : null}
            </div>

            <div className="flex justify-center mt-4">
                {canDownload && (
                    <button
                        onClick={onOpenDownload}
                        disabled={!selectedColumn}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Descargar Gráfico
                    </button>
                )}
            </div>
        </div>
    );
}
