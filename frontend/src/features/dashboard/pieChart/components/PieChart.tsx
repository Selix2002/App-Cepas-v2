// src/components/pieChart/PieChart.tsx

import { ResponsivePie, type PieTooltipProps } from "@nivo/pie";
import type { PieDataItem, MyPieProps } from "../../../../shared/interfaces/index_charts";

// El componente de tooltip no cambia, sigue siendo excelente.
const CustomTooltip = ({ datum }: PieTooltipProps<PieDataItem>) => (
  <div
    className="flex flex-col items-start gap-2 rounded-md border-2 bg-black/85 p-3 text-white"
    style={{ borderColor: datum.color }}
  >
    <div className="flex items-center gap-2">
      <strong className="font-bold" style={{ color: datum.color }}>
        Nombre:
      </strong>
      <span>{datum.id}</span>
    </div>
    <div className="flex items-center gap-2">
      <strong className="font-bold">Valor:</strong>
      <span>{datum.value}</span>
    </div>
  </div>
);

// El componente del gráfico ahora es puramente de presentación.
// Recibe los datos ya procesados y los muestra.
const MyPieChart = ({ data }: MyPieProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsivePie
      data={data}
      tooltip={({ datum }: PieTooltipProps<PieDataItem>) => (
        <CustomTooltip datum={datum} />
      )}
      margin={{ top: 40, right: 100, bottom: 80, left: 80 }}
      innerRadius={0.5}
      padAngle={0.6}
      cornerRadius={2}
      enableArcLabels={true} 
      arcLabel={d => {
        if (total === 0) return '0%(0)';
        // Calculamos el porcentaje
        const percentage = ((d.value / total) * 100).toFixed(1);
        // Devolvemos el nuevo formato: "porcentaje%(valor_absoluto)"
        return `${percentage}%(${d.value})`;
      }}
      activeOuterRadiusOffset={15}
      // Asigna los colores desde la propiedad 'color' de cada dato.
      colors={{ datum: "data.color" }}
      arcLinkLabelsSkipAngle={15}
      arcLinkLabelsThickness={3}
      arcLinkLabelsColor={{ from: "color" }}
      arcLabelsSkipAngle={18}
      arcLabelsTextColor={{ from: "color", modifiers: [["darker", 10]] }}
      theme={{
        legends: {
          text: {
            fontSize: 15,
            fill: "#ffffff",
          },
        },
        labels: {
          text: {
            fontSize: 15,
            fill: "#ffffff",
          },
        },
      }}
      legends={[
        {
          anchor: "right",
          direction: "column",
          translateY: 20,
          itemWidth: data.length > 15 ? 70 : 180,
          itemHeight: data.length > 10 ? 8 : 30,
          symbolShape: "circle",
          itemsSpacing: 10,
        },
      ]}
    />
  );
};

export default MyPieChart;
