// src/features/dashboard/barChart/components/barChart.tsx
import React from "react"
import { ResponsiveBar } from "@nivo/bar"
import { useTheme } from "../../../../app/ThemeContext"
import "./bar-chart.css"

// ── tipos ──────────────────────────────────────────────────────────────────
export type BarChartDatum = Record<string, number | string>

export interface BarChartProps {
  data: BarChartDatum[]
  keys: string[]
  indexBy: string
  xLabel?: string
  yLabel?: string
  groupMode?: "grouped" | "stacked"
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  enableLabels?: boolean
  maxLegendItems?: number
}

// ── paleta bioluminiscente — misma que PieChart y sidebar dots ─────────────
const BIO_COLORS: string[] = [
  "#00e5b4", "#4d9fff", "#ff8c42", "#a78bfa", "#ff4d6d",
  "#00c4a0", "#3a8aff", "#ffb347", "#c084fc", "#ff6b8a",
  "#00a888", "#2878dd", "#ff9830", "#9060e0", "#ff5277",
  "#1de9b6", "#29b6f6", "#ffa726", "#ab47bc", "#ef5350",
  "#26c6da", "#66bb6a", "#ffca28", "#8d6e63", "#78909c",
]

const generateBioColor = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  const h = ((hash * 137.508) % 120 + 160 + 360) % 360
  const s = 60 + (Math.abs(hash) % 20)
  const l = 52 + (Math.abs(hash) % 12)
  return `hsl(${h}, ${s}%, ${l}%)`
}


// ── componente ─────────────────────────────────────────────────────────────
const BarChart: React.FC<BarChartProps> = ({
  data,
  keys,
  indexBy,
  xLabel,
  yLabel = "Cantidad",
  groupMode = "stacked",
  enableLabels = true,
  margin,
  maxLegendItems = 15,
}) => {
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#ffffff" : "#000000"

  const BIO_THEME = {
    background: "transparent",
    text: { fontFamily: "'Courier New', monospace", fontSize: 11, fill: textColor },
    labels: { text: { fontFamily: "'Courier New', monospace", fontSize: 10, fontWeight: 700, fill: textColor } },
    axis: {
      domain: { line: { stroke: "#1a2f28", strokeWidth: 1 } },
      ticks: {
        line: { stroke: "#1a2f28", strokeWidth: 1 },
        text: { fontFamily: "'Courier New', monospace", fontSize: 10, fill: textColor },
      },
      legend: { text: { fontFamily: "'Courier New', monospace", fontSize: 11, fill: textColor, letterSpacing: 1 } },
    },
    grid: { line: { stroke: "#1a2f2855", strokeWidth: 1, strokeDasharray: "3 3" } },
    legends: {
      text: { fontFamily: "'Courier New', monospace", fontSize: 11, fill: textColor },
      title: { text: { fontFamily: "'Courier New', monospace", fill: textColor } },
    },
    tooltip: {
      container: {
        background: "#0b1220",
        border: "1px solid #1a2f28",
        borderRadius: 4,
        padding: "8px 12px",
        boxShadow: "0 8px 24px #00000088",
      },
    },
  }

  const m = {
    top:    24,
    right:  140,
    bottom: xLabel ? 56 : 36,
    left:   yLabel ? 48 : 48,
    ...(margin ?? {}),
  }

  const colorMap: Record<string, string> = {}
  keys.forEach((label, i) => {
    colorMap[label] = i < BIO_COLORS.length ? BIO_COLORS[i] : generateBioColor(label)
  })

  const visibleLegendKeys = keys.length > maxLegendItems ? keys.slice(0, maxLegendItems) : keys
  const legendData = visibleLegendKeys.map((k) => ({
    id: k,
    label: k,
    color: colorMap[k] ?? "#3a6a5a",
  }))

  return (
    <div className="bar-chart-wrap">
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        groupMode={groupMode}
        margin={m}
        padding={0.35}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={({ id }) => colorMap[id as string] ?? "#3a6a5a"}
        borderRadius={3}
        borderWidth={0}
        enableGridY
        enableGridX={false}
        enableLabel={enableLabels}
        labelTextColor={textColor}
        labelSkipWidth={14}
        labelSkipHeight={14}
        axisBottom={{
          tickSize: 3,
          tickPadding: 5,
          tickRotation: 0,
          legend: xLabel,
          legendOffset: 44,
          legendPosition: "middle",
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 10,
          legend: yLabel,
          legendOffset: -44,
          legendPosition: "middle",
          format: (v) => Math.floor(v as number).toString(),
        }}
        tooltip={({ id, value, indexValue, color }) => (
          <div
            className="bar-chart-tooltip"
            style={{ '--tip-c': color, '--tip-ca': `${color}44` } as React.CSSProperties}
          >
            <div className="bar-chart-tooltip-index">{String(indexValue)}</div>
            <div className="bar-chart-tooltip-value-row">
              <span className="bar-chart-tooltip-value">{value}</span>
              <span className="bar-chart-tooltip-key">{String(id)}</span>
            </div>
          </div>
        )}
        legends={[
          {
            dataFrom: "keys",
            data: legendData,
            anchor: "right",
            direction: "column",
            justify: false,
            translateX: 120,
            translateY: xLabel ? 16 : 0,
            itemsSpacing: visibleLegendKeys.length > 10 ? 4 : 10,
            itemWidth: 108,
            itemHeight: visibleLegendKeys.length > 10 ? 10 : 16,
            itemDirection: "left-to-right",
            symbolSize: visibleLegendKeys.length > 10 ? 8 : 12,
            symbolShape: "square",
            effects: [{ on: "hover", style: { itemTextColor: "#00e5b4", symbolSize: visibleLegendKeys.length > 10 ? 10 : 14 } }],
          },
        ]}
        theme={BIO_THEME}
        role="img"
        ariaLabel="Gráfico de barras"
      />
    </div>
  )
}

export default BarChart
