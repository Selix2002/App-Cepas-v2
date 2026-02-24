// src/components/barChart/barChart.tsx
import React from "react";
import { ResponsiveBar } from "@nivo/bar";

export type BarChartDatum = Record<string, number | string>;

export interface BarChartProps {
  data: BarChartDatum[];
  keys: string[];
  indexBy: string;
  xLabel?: string;
  yLabel?: string;
  groupMode?: "grouped" | "stacked";
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  enableLabels?: boolean;
}

const PREDEFINED_COLORS: string[] = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
  "#aec7e8",
  "#ffbb78",
  "#98df8a",
  "#ff9896",
  "#c5b0d5",
  "#c49c94",
  "#f7b6d2",
  "#c7c7c7",
  "#dbdb8d",
  "#9edae5",
  "#393b79",
  "#637939",
  "#8c6d31",
  "#843c39",
  "#7b4173",
];

const generateHSLColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const GOLDEN_ANGLE = 137.508;
  const h = (hash * GOLDEN_ANGLE) % 360;
  const hue = ((h % 360) + 360) % 360;
  const saturation = 60 + (hash % 11) * 2;
  const lightness = 45 + (hash % 11);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const BarChart: React.FC<BarChartProps> = ({
  data,
  keys,
  indexBy,
  xLabel,
  yLabel = "Cantidad",
  groupMode = "stacked", // <- por defecto APILADO
  enableLabels = true, // <- mostramos números dentro de cada segmento
  margin,
}) => {
  const m = {
    top: 24,
    right: 132,
    bottom: xLabel ? 56 : 36,
    left: yLabel ? 42 : 48,
    ...(margin ?? {}),
  };

  const colorMap: Record<string, string> = {};
  keys.forEach((label, index) => {
    if (index < PREDEFINED_COLORS.length) {
      colorMap[label] = PREDEFINED_COLORS[index];
    } else {
      colorMap[label] = generateHSLColorFromString(label);
    }
  });

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        groupMode={groupMode}
        margin={m}
        padding={0.4}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        colors={({ id }) => colorMap[id as string] || "#ccc"}
        enableGridY
        enableGridX={false}
        borderRadius={2}
        // Etiquetas dentro de cada segmento
        enableLabel={enableLabels}
        labelTextColor={{ from: "color", modifiers: [["darker", 2.2]] }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        axisBottom={{
          tickSize: 2,
          tickPadding: 3,
          legend: xLabel,
          legendOffset: 40,
          legendPosition: "middle",
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: yLabel,
          legendOffset: -48,
          legendPosition: "middle",
          format: (value) => Math.floor(value as number).toString(), // solo enteros
        }}
        tooltip={({ id, value, indexValue, color }) => (
          <div
            style={{
              background: "#111827",
              color: "white",
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${String(color)}`,
              fontSize: 12,
              whiteSpace: "nowrap", // <- evita saltos de línea
              display: "inline-block", // <- permite que crezca a lo ancho
            }}
          >
            {`${indexValue} / ${String(id)}: ${value as number}`}
          </div>
        )}
        legends={[
          {
            dataFrom: "keys",
            anchor: "right",
            direction: "column",
            translateY: xLabel ? 16 : 40,
            translateX: 94,
            itemsSpacing: 12,
            itemWidth: 96,
            itemHeight: 3,
            symbolSize: 12,
            itemOpacity: 0.9,
          },
        ]}
        theme={{
          text: { fill: "#e5e7eb", fontSize: 14 }, //
          labels: { text: { fontSize: 13, fontWeight: 600 } },
          axis: {
            domain: { line: { stroke: "#4b5563", strokeWidth: 1 } },
            ticks: { line: { stroke: "#4b5563" }, text: { fill: "#e5e7eb" } },
            legend: { text: { fill: "#e5e7eb", fontSize: 15 } },
          },
          grid: { line: { stroke: "#374151" } },
          legends: { text: { fill: "#e5e7eb" } },
          tooltip: { container: { background: "#111827" } },
        }}
        role="img"
        ariaLabel="Gráfico de barras apiladas"
      />
    </div>
  );
};

export default BarChart;
