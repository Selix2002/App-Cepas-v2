import { useState, useMemo, useCallback } from "react"
import type { GridApi } from "ag-grid-community"
import type { Cepa } from "../../../../shared/interfaces"

export type CoordFilter = { lat: number; lng: number }

type UseCepasMapParams = {
    gridApi?: GridApi
    rawTableData: Cepa[]
    filterVersion: number
}

export function useCepasMap({ gridApi, rawTableData, filterVersion }: UseCepasMapParams) {
    const [mapOpen, setMapOpen] = useState(true)
    const [coordFilter, setCoordFilter] = useState<CoordFilter | null>(null)

    const visibleRows = useMemo((): Cepa[] => {
        if (!gridApi) return rawTableData
        const rows: Cepa[] = []
        if (gridApi.isAnyFilterPresent()) {
            gridApi.forEachNodeAfterFilter((n) => rows.push(n.data))
        } else {
            gridApi.forEachNode((n) => rows.push(n.data))
        }
        return rows
    }, [gridApi, rawTableData, filterVersion]) // eslint-disable-line react-hooks/exhaustive-deps

    const validRowsForMap = useMemo(
        () => visibleRows.filter((r) => Number.isFinite(r.latitud) && Number.isFinite(r.longitud)),
        [visibleRows]
    )

    const markersCount = validRowsForMap.length

    const handleMapPointDblClick = useCallback(
        (lat: number, lng: number) => {
            setMapOpen(false)
            if (!gridApi) return

            const lat6 = Number(lat.toFixed(6))
            const lng6 = Number(lng.toFixed(6))

            gridApi.setFilterModel({
                ...(gridApi.getFilterModel() ?? {}),
                latitud: { filterType: "number", type: "equals", filter: lat6 },
                longitud: { filterType: "number", type: "equals", filter: lng6 },
            })
            gridApi.onFilterChanged()
            gridApi.setColumnsVisible(["latitud", "longitud"], true)
            setCoordFilter({ lat: lat6, lng: lng6 })
        },
        [gridApi]
    )

    const clearCoordFilters = useCallback(() => {
        if (!gridApi) return
        const model = { ...(gridApi.getFilterModel() ?? {}) }
        delete (model as Record<string, unknown>).latitud
        delete (model as Record<string, unknown>).longitud
        gridApi.setFilterModel(model)
        gridApi.onFilterChanged()
        setCoordFilter(null)
    }, [gridApi])

    return {
        mapOpen,
        setMapOpen,
        coordFilter,
        validRowsForMap,
        markersCount,
        handleMapPointDblClick,
        clearCoordFilters,
    }
}