// src/features/cepas/components/table/CheckboxCellRenderer.tsx
import type { ICellRendererParams } from "ag-grid-community"

export type ChartType = "pie" | "bar"
export type ColumnSelection = {
    field: string
    name: string
}

type CheckboxCellRendererParams = ICellRendererParams & {
    chartType: ChartType
    onColumnToggle: (selection: ColumnSelection, checked: boolean) => void
    selectedColumns: ColumnSelection[]
}

const FILTER_ROW_ID = "__filter__"

export default function CheckboxCellRenderer(params: CheckboxCellRendererParams) {
    if (params.data && params.data.id === FILTER_ROW_ID) {
        const field = params.colDef?.field
        const name = params.colDef?.headerName || field
        if (!field || !name) return null

        const checked = params.selectedColumns.some((c) => c.field === field)
        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            params.onColumnToggle({ field, name }, e.target.checked)
        }

        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                <input
                    type="checkbox"
                    style={{ cursor: "pointer" }}
                    checked={checked}
                    onChange={onChange}
                    aria-label={`Seleccionar columna ${name}`}
                />
            </div>
        )
    }

    return params.valueFormatted ?? params.value ?? "N/I"
}