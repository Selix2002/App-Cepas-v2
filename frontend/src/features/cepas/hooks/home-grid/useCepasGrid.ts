import { useState, useEffect, useCallback } from "react"
import type { GridApi, Column } from "ag-grid-community"
import type { GridReadyCallback } from "../../components/CepasTable"
import { exportToExcel } from "../../../../shared/utils/exportExcel"
import type { User, Cepa } from "../../../../shared/interfaces"

type UseCepasGridParams = {
    user: User | null
}

function getHiddenColumnsKey(userId: string) {
    return `hidden_columns_${userId}`
}

function loadHiddenColumns(userId: string): string[] {
    try {
        const raw = localStorage.getItem(getHiddenColumnsKey(userId))
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveHiddenColumns(userId: string, colIds: string[]) {
    localStorage.setItem(getHiddenColumnsKey(userId), JSON.stringify(colIds))
}

export function useCepasGrid({ user }: UseCepasGridParams) {
    const [gridApi, setGridApi] = useState<GridApi | undefined>(undefined)
    const [columns, setColumns] = useState<Column[]>([])
    const [rawTableData, setRawTableData] = useState<Cepa[]>([])
    const [filterVersion, setFilterVersion] = useState(0)
    const [refreshToken, setRefreshToken] = useState(0)

    const handleDataLoaded = useCallback((data: Cepa[]) => {
        setRawTableData(data)
    }, [])

    // Suscribir evento de filtros
    useEffect(() => {
        if (!gridApi) return
        const listener = () => setFilterVersion((v) => v + 1)
        gridApi.addEventListener("filterChanged", listener)
        return () => {
            if (!gridApi || gridApi.isDestroyed?.()) return
            gridApi.removeEventListener("filterChanged", listener)
        }
    }, [gridApi])

    const handleGridReady: GridReadyCallback = (params) => {
        const api = params.api
        setGridApi(api)

        // Restaurar columnas ocultas desde localStorage
        if (user?.id) {
            const hiddenCols = loadHiddenColumns(user.id)
            if (hiddenCols.length > 0) {
                api.setColumnsVisible(hiddenCols, false)
            }
        }

        setColumns(api.getColumns() ?? [])
    }

    const handleExport = () => {
        if (!gridApi) return
        exportToExcel(gridApi, "Cepas", "cepas.xlsx")
    }

    const handleToggleColumnVisibility = (colId: string, visible: boolean) => {
        if (!gridApi || !user?.id) return

        gridApi.setColumnsVisible([colId], visible)
        setColumns(gridApi.getColumns() ?? [])

        // Persistir en localStorage
        const hiddenCols = (gridApi.getColumns() ?? [])
            .filter((c) => !c.isVisible())
            .map((c) => c.getColId())
        saveHiddenColumns(user.id, hiddenCols)
    }

    return {
        gridApi,
        columns,
        rawTableData,
        filterVersion,
        refreshToken,
        setRefreshToken,
        handleGridReady,
        handleDataLoaded,
        handleToggleColumnVisibility,
        handleExport,
    }
}