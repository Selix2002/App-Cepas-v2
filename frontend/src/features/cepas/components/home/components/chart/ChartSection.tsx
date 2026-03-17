// src/features/cepas/components/home/components/chart/ChartSection.tsx
import type { RefObject } from "react"
import MyPieChart from "../../../../../dashboard/pieChart/components/PieChart"
import BarChart   from "../../../../../dashboard/barChart/components/barChart"
import type {
  ChartType,
  ColumnSelection,
  BarDataset,
} from "../../../../hooks/charts/useCepasCharts"

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
    <div
      style={{
        background: "#0f1a2e",
        borderBottom: "1px solid #1a2f28",
        padding: "14px 24px 12px",
        flexShrink: 0,
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* ── header row ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        {/* left: analysis label */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span
            style={{
              fontSize: 10,
              color: "#3a6a5a",
              letterSpacing: 2,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Análisis:
          </span>
          <span
            style={{
              fontSize: 13,
              color: "#00e5b4",
              fontWeight: 700,
              marginLeft: 8,
            }}
          >
            {selectedColumn?.name ?? "Ninguna"}
          </span>
          {chartType === "bar" && selectedColumns.length === 1 && (
            <span
              style={{
                fontSize: 10,
                color: "#3a6a5a",
                marginLeft: 10,
                letterSpacing: 1,
              }}
            >
              · selecciona una segunda columna
            </span>
          )}
        </div>

        {/* right: type buttons + download */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["bar", "pie"] as ChartType[]).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              style={{
                padding: "4px 14px",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: "pointer",
                border: "1px solid",
                transition: "all 0.1s",
                ...(chartType === t
                  ? {
                      background: "#00e5b422",
                      borderColor: "#00b48e",
                      color: "#00e5b4",
                    }
                  : {
                      background: "transparent",
                      borderColor: "#1a2f28",
                      color: "#3a6a5a",
                    }),
              }}
            >
              {t === "bar" ? "Barras" : "Torta"}
            </button>
          ))}

          {canDownload && (
            <button
              onClick={onOpenDownload}
              disabled={!hasChart}
              style={{
                padding: "4px 14px",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: hasChart ? "pointer" : "not-allowed",
                border: "1px solid",
                transition: "all 0.15s",
                ...(hasChart
                  ? {
                      background: "#00e5b422",
                      borderColor: "#00b48e",
                      color: "#00e5b4",
                    }
                  : {
                      background: "transparent",
                      borderColor: "#1a2f28",
                      color: "#1e3a30",
                    }),
              }}
            >
              ↓ Descargar
            </button>
          )}
        </div>
      </div>

      {/* ── chart body ───────────────────────────────────────────────────── */}
      <div
        ref={chartRef}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 170,
          background: "#0b1220",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {!hasChart ? (
          /* empty placeholder */
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 170,
              fontSize: 11,
              color: "#1e3a30",
              letterSpacing: 1,
              border: "1px dashed #1a2f28",
              borderRadius: 4,
              fontFamily: "inherit",
            }}
          >
            {chartType === "pie"
              ? "— Selecciona una columna del panel izquierdo —"
              : "— Selecciona dos columnas para el gráfico de barras —"}
          </div>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
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
          </div>
        )}
      </div>
    </div>
  )
}
