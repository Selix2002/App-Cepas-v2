// src/features/cepas/components/table/CheckboxCellRenderer.tsx
import type { ICellRendererParams } from "ag-grid-community";

export type ChartType = "pie" | "bar";

export type ColumnSelection = {
    field: string;
    name: string;
};

type CheckboxCellRendererParams = ICellRendererParams & {
    chartType: ChartType;
    onColumnToggle: (selection: ColumnSelection, checked: boolean) => void;
    selectedColumns: ColumnSelection[];
};

const filterRowId = 0;

export default function CheckboxCellRenderer(params: CheckboxCellRendererParams) {
    // Sólo actuamos en la fila "especial" (la de filtros / selectores)
    if (params.data && params.data.id === filterRowId) {
        const field = params.colDef?.field;
        const name = params.colDef?.headerName || field;
        if (!field || !name) return null;

        const checked = params.selectedColumns.some((c) => c.field === field);

        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            params.onColumnToggle({ field, name }, e.target.checked);
        };

        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                }}
            >
                <input
                    type="checkbox"
                    style={{ cursor: "pointer" }}
                    checked={checked}
                    onChange={onChange}
                    aria-label={`Seleccionar columna ${name}`}
                />
            </div>
        );
    }

    // Para el resto de filas → mostramos el valor normal
    return params.value ?? null;
}
