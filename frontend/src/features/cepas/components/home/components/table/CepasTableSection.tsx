// src/features/cepas/components/home/CepasTableSection.tsx
import CepasTable from "../../../CepasTable";
import type { GridReadyCallback } from "../../../CepasTable";
import type { ChartType, ColumnSelection } from "../../../../hooks/charts/useCepasCharts";

type CepasTableSectionProps = {
    onGridReady: GridReadyCallback;
    onDataLoaded: (data: any[]) => void;
    chartType: ChartType;
    onColumnToggle: (selection: ColumnSelection, checked: boolean) => void;
    selectedColumns: ColumnSelection[];
    refreshToken: number;
};

export default function CepasTableSection({
    onGridReady,
    onDataLoaded,
    chartType,
    onColumnToggle,
    selectedColumns,
    refreshToken,
}: CepasTableSectionProps) {
    return (
        <div className="min-h-[100vh] md:min-h-[120vh] border-t border-gray-700 p-4 box-border">
            <CepasTable
                onGridReady={onGridReady}
                onDataLoaded={onDataLoaded}
                chartType={chartType}
                onColumnToggle={onColumnToggle}
                selectedColumns={selectedColumns}
                refreshToken={refreshToken}
            />
        </div>
    );
}
