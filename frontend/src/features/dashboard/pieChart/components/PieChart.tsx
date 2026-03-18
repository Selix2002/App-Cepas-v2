// src/features/dashboard/pieChart/components/PieChart.tsx

import { ResponsivePie, type PieTooltipProps } from "@nivo/pie"
import type { PieDataItem, MyPieProps } from "../../../../shared/interfaces/index_charts"

// ── paleta bioluminiscente ─────────────────────────────────────────────────
// Misma que DOT_COLORS del sidebar — cohesión visual total
const BIO_COLORS = [
  "#00e5b4", "#4d9fff", "#ff8c42", "#a78bfa", "#ff4d6d",
  "#00c4a0", "#3a8aff", "#ffb347", "#c084fc", "#ff6b8a",
  "#00a888", "#2878dd", "#ff9830", "#9060e0", "#ff5277",
  "#1de9b6", "#29b6f6", "#ffa726", "#ab47bc", "#ef5350",
  "#26c6da", "#66bb6a", "#ffca28", "#8d6e63", "#78909c",
]

// ── NIVO theme ─────────────────────────────────────────────────────────────
const BIO_THEME = {
  background: "transparent",
  text: {
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    fill: "#8ab0a0",
  },
  labels: {
    text: {
      fontFamily: "'Courier New', monospace",
      fontSize: 11,
      fontWeight: 700,
      fill: "#e8f4f0",
    },
  },
  legends: {
    text: {
      fontFamily: "'Courier New', monospace",
      fontSize: 11,
      fill: "#8ab0a0",
    },
    title: {
      text: {
        fontFamily: "'Courier New', monospace",
        fill: "#3a6a5a",
      },
    },
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
  grid: {
    line: {
      stroke: "#1a2f28",
    },
  },
}

// ── custom tooltip bioluminiscente ─────────────────────────────────────────
const CustomTooltip = ({ datum }: PieTooltipProps<PieDataItem>) => (
  <div
    style={{
      background: "#0b1220",
      border: `1px solid ${datum.color}44`,
      borderLeft: `2px solid ${datum.color}`,
      borderRadius: 4,
      padding: "8px 14px",
      fontFamily: "'Courier New', monospace",
      boxShadow: `0 8px 24px #00000088, 0 0 12px ${datum.color}18`,
      minWidth: 140,
    }}
  >
    {/* nombre */}
    <div
      style={{
        fontSize: 9,
        color: "#3a6a5a",
        letterSpacing: 2,
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {datum.id}
    </div>
    {/* valor */}
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontSize: 20, fontWeight: 700, color: datum.color, lineHeight: 1 }}>
        {datum.value}
      </span>
      <span style={{ fontSize: 10, color: "#3a6a5a" }}>
        {datum.formattedValue}
      </span>
    </div>
  </div>
)

// ── component ──────────────────────────────────────────────────────────────
const MyPieChart = ({ data }: MyPieProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  // Reasignar colores bioluminiscentes en orden
  const coloredData = data.map((item, i) => ({
    ...item,
    color: BIO_COLORS[i % BIO_COLORS.length],
  }))

  // Cuántos items hay — ajustar márgenes y leyenda
  const manyItems = data.length > 15
  const someItems = data.length > 10

  return (
    <ResponsivePie
      data={coloredData}

      // ── geometría ────────────────────────────────────────────────────
      margin={{ top: 40, right: manyItems ? 110 : 180, bottom: 50, left: 40 }}
      innerRadius={0.52}
      padAngle={0.8}
      cornerRadius={5}
      activeOuterRadiusOffset={20}

      // ── colores ───────────────────────────────────────────────────────
      colors={{ datum: "data.color" }}
      borderWidth={1}
      borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}

      // ── arc labels (dentro de cada segmento) ─────────────────────────
      enableArcLabels
      arcLabel={(d) => {
        if (total === 0) return "0%"
        const pct = ((d.value / total) * 100).toFixed(1)
        return `${pct}%`
      }}
      arcLabelsSkipAngle={14}
      arcLabelsTextColor={{ from: "color", modifiers: [["brighter", 1.5]] }}
      arcLabelsRadiusOffset={0.65}

      // ── arc link lines (etiquetas externas) ───────────────────────────
      arcLinkLabel={(d) => `${d.id} (${d.value})`}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsOffset={4}
      arcLinkLabelsDiagonalLength={14}
      arcLinkLabelsStraightLength={20}
      arcLinkLabelsThickness={1}
      arcLinkLabelsColor={{ from: "color", modifiers: [["darker", 0.3]] }}
      arcLinkLabelsTextColor="#8ab0a0"

      // ── tooltip ───────────────────────────────────────────────────────
      tooltip={({ datum }) => <CustomTooltip datum={datum} />}

      // ── tema NIVO ────────────────────────────────────────────────────
      theme={BIO_THEME}

      // ── leyenda lateral ───────────────────────────────────────────────
      legends={[
        {
          anchor: "right",
          direction: "column",
          justify: false,
          translateX: manyItems ? 74 : 140,
          translateY: 0,
          itemsSpacing: someItems ? 3 : 8,
          itemWidth: manyItems ? 64 : 130,
          itemHeight: someItems ? 10 : 18,
          itemDirection: "left-to-right",
          symbolSize: someItems ? 8 : 12,
          symbolShape: "circle",
          effects: [
            {
              on: "hover",
              style: {
                itemTextColor: "#00e5b4",
                symbolSize: someItems ? 10 : 14,
              },
            },
          ],
        },
      ]}
    />
  )
}

export default MyPieChart
