import { useEffect, useState } from "react"
import type { ColDef } from "ag-grid-community"
import { getCepas } from "../../services/CepasQuery"
import { getCepasColumnDefsWithExtras } from "../../components/CepasColumns"
import type { Cepa } from "../../../../shared/interfaces"
import CheckboxCellRenderer, {
  type ChartType,
  type ColumnSelection,
} from "../../components/table/CheckboxCellRenderer"

export type NotificationState = {
  text: string
  type: "success" | "error"
} | null

type UseCepasTableDataArgs = {
  onDataLoaded: (data: Cepa[]) => void
  chartType: ChartType
  onColumnToggle: (selection: ColumnSelection, checked: boolean) => void
  selectedColumns: ColumnSelection[]
  refreshToken?: number
}

const FILTER_ROW_ID = "__filter__"

export function useCepasTableData({
  onDataLoaded,
  chartType,
  onColumnToggle,
  selectedColumns,
  refreshToken,
}: UseCepasTableDataArgs) {
  const [rowData, setRowData] = useState<Cepa[]>([])
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([])
  const [pinnedTopRowDataState, setPinnedTopRowDataState] = useState<object[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [notification, setNotification] = useState<NotificationState>(null)

  // Fetch de datos
  useEffect(() => {
    setLoading(true)
    getCepas()
      .then(({ items }) => {
        onDataLoaded(items)
        setRowData(items)
        setPinnedTopRowDataState([{ id: FILTER_ROW_ID }])
        console.log("Cepas cargadas:", items)  // Log para depuración --- IGNORE ---
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false))
  }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Construcción de columnas
  useEffect(() => {
    if (rowData.length === 0) return

    const baseColumnDefs = getCepasColumnDefsWithExtras(rowData as unknown as Record<string, unknown>[])
    const enhancedColumnDefs = baseColumnDefs.map((colDef) => ({
      ...colDef,
      cellRenderer: CheckboxCellRenderer,
      cellRendererParams: {
        chartType,
        onColumnToggle,
        selectedColumns,
      },
    }))
    setColumnDefs(enhancedColumnDefs)
  }, [rowData, chartType, onColumnToggle, selectedColumns])

  return {
    rowData,
    setRowData,
    columnDefs,
    pinnedTopRowDataState,
    loading,
    error,
    notification,
    setNotification,
  }
}