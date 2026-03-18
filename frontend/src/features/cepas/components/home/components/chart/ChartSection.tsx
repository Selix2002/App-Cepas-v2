// src/features/cepas/components/home/components/chart/ChartSection.tsx
import type { RefObject } from "react"
import MyPieChart from "../../../../../dashboard/pieChart/components/PieChart"
import BarChart from "../../../../../dashboard/barChart/components/barChart"
import type {
  ChartType,
  ColumnSelection,
  BarDataset,
} from "../../../../hooks/charts/useCepasCharts"
import "./chart-section.css"

type Props = {
  chartRef: RefObject<HTMLDivElement | null>
  chartType: ChartType
  setChartType: (t: ChartType) => void
  selectedColumn: ColumnSelection | null
  selectedColumns: ColumnSelection[]
  pieChartData: any[]
  barDataset: BarDataset | null
  canDownload: boolean
  onOpenDownload: () => void
}

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
}: Props) {
  const hasChart =
    (chartType === "pie" && !!selectedColumn && pieChartData.length > 0) ||
    (chartType === "bar" && selectedColumns.length === 2 && !!barDataset)

  return (
    <div className="cs-wrap">
      {/* ── header row ─────────────────────────────────────────────────── */}
      <div className="cs-header">
        <div className="cs-analysis-label">
          <span className="cs-label-text">Análisis:</span>
          <span className="cs-col-name">{selectedColumn?.name ?? "Ninguna"}</span>
          {chartType === "bar" && selectedColumns.length === 1 && (
            <span className="cs-hint">· selecciona una segunda columna</span>
          )}
        </div>

        <div className="cs-actions">
          {(["bar", "pie"] as ChartType[]).map((t) => (
            <button
              key={t}
              className={`cs-type-btn ${chartType === t ? "cs-type-btn--active" : ""}`}
              onClick={() => setChartType(t)}
            >
              {t === "bar" ? "Barras" : "Torta"}
            </button>
          ))}

          {canDownload && (
            <button
              className={`cs-download-btn ${hasChart ? "cs-download-btn--active" : ""}`}
              onClick={onOpenDownload}
              disabled={!hasChart}
            >
              ↓ Descargar
            </button>
          )}
        </div>
      </div>

      {/* ── chart body ─────────────────────────────────────────────────── */}
      <div className="cs-chart-body">
        <div
          ref={chartRef}
          className={`cs-chart-frame ${hasChart ? "cs-chart-frame--visible" : "cs-chart-frame--empty"}`}
        >
          {!hasChart ? (
            <div className="cs-no-chart">
              {chartType === "pie"
                ? "— Selecciona una columna del panel izquierdo —"
                : "— Selecciona dos columnas para el gráfico de barras —"}
            </div>
          ) : (
            <>
              {chartType === "pie" && pieChartData.length > 0 && (
                <MyPieChart data={pieChartData} />
              )}
              {chartType === "bar" && barDataset && (
                <BarChart
                  data={barDataset.data}
                  keys={barDataset.keys}
                  indexBy={barDataset.indexBy}
                  xLabel={selectedColumns[0]?.name ?? ""}
                  yLabel="Cantidad"
                  groupMode="stacked"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
