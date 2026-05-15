// src/features/dashboard/pieChart/components/PieChart.tsx
import React from "react"
import { ResponsivePie, type PieTooltipProps } from "@nivo/pie"
import type { PieDataItem, MyPieProps } from "../../../../shared/interfaces/index_charts"
import { useTheme } from "../../../../app/ThemeContext"
import "./pie-chart.css"

// ── paleta bioluminiscente ─────────────────────────────────────────────────
const BIO_COLORS = [
  "#00e5b4", "#4d9fff", "#ff8c42", "#a78bfa", "#ff4d6d",
  "#00c4a0", "#3a8aff", "#ffb347", "#c084fc", "#ff6b8a",
  "#00a888", "#2878dd", "#ff9830", "#9060e0", "#ff5277",
  "#1de9b6", "#29b6f6", "#ffa726", "#ab47bc", "#ef5350",
  "#26c6da", "#66bb6a", "#ffca28", "#8d6e63", "#78909c",
]


// ── custom tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ datum }: PieTooltipProps<PieDataItem>) => (
  <div
    className="pie-chart-tooltip"
    style={{ '--tip-c': datum.color, '--tip-ca': `${datum.color}44` } as React.CSSProperties}
  >
    <div className="pie-chart-tooltip-label">{datum.id}</div>
    <div className="pie-chart-tooltip-value-row">
      <span className="pie-chart-tooltip-value">{datum.value}</span>
    </div>
  </div>
)

// ── component ──────────────────────────────────────────────────────────────
const MyPieChart = ({ data, maxLegendItems = 15 }: MyPieProps) => {
  const { theme } = useTheme()
  const textColor = theme === "dark" ? "#ffffff" : "#000000"

  const BIO_THEME = {
    background: "transparent",
    text: { fontFamily: "'Courier New', monospace", fontSize: 11, fill: textColor },
    labels: { text: { fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, fill: textColor } },
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
    grid: { line: { stroke: "#1a2f28" } },
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)

  const coloredData = data.map((item, i) => ({
    ...item,
    color: BIO_COLORS[i % BIO_COLORS.length],
  }))

  const manyItems = data.length > 15
  const someItems = data.length > 10

  const visibleLegendData = coloredData.length > maxLegendItems
    ? coloredData.slice(0, maxLegendItems)
    : coloredData

  return (
    <ResponsivePie
      data={coloredData}
      margin={{ top: 40, right: manyItems ? 110 : 180, bottom: 50, left: 40 }}
      innerRadius={0.52}
      padAngle={0.8}
      cornerRadius={5}
      activeOuterRadiusOffset={20}
      colors={{ datum: "data.color" }}
      borderWidth={1}
      borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
      enableArcLabels
      arcLabel={(d) => {
        if (total === 0) return "0%"
        const pct = ((d.value / total) * 100).toFixed(1)
        return `${pct}%`
      }}
      arcLabelsSkipAngle={14}
      arcLabelsTextColor={textColor}
      arcLabelsRadiusOffset={0.65}
      arcLinkLabel={(d) => `${d.id} (${d.value})`}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsOffset={4}
      arcLinkLabelsDiagonalLength={14}
      arcLinkLabelsStraightLength={20}
      arcLinkLabelsThickness={1}
      arcLinkLabelsColor={{ from: "color", modifiers: [["darker", 0.3]] }}
      arcLinkLabelsTextColor={textColor}
      tooltip={({ datum }) => <CustomTooltip datum={datum} />}
      theme={BIO_THEME}
      legends={[
        {
          anchor: "right",
          direction: "column",
          justify: false,
          translateX: manyItems ? 74 : 100,
          translateY: 0,
          data: visibleLegendData.map((d) => ({
            id: d.id,
            label: String(d.label ?? d.id),
            color: d.color ?? BIO_COLORS[0],
          })),
          itemsSpacing: someItems ? 3 : 8,
          itemWidth: manyItems ? 200 : 130,
          itemHeight: someItems ? 10 : 18,
          itemDirection: "left-to-right",
          symbolSize: someItems ? 8 : 12,
          symbolShape: "circle",
          effects: [{ on: "hover", style: { itemTextColor: "#00e5b4", symbolSize: someItems ? 10 : 14 } }],
        },
      ]}
    />
  )
}

export default MyPieChart
