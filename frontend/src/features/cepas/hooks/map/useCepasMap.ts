// src/features/cepas/hooks/map/useCepasMap.ts
// Sin ninguna dependencia de ag-grid.
import { useState, useMemo, useCallback } from "react"
import type { Cepa } from "../../../../shared/interfaces"
import type { CoordFilter } from "../../types/tableTypes"

type Params = {
    filteredData: Cepa[]
    coordFilter: CoordFilter | null
    setCoordFilter: (f: CoordFilter | null) => void
}

export function useCepasMap({ filteredData, coordFilter, setCoordFilter }: Params) {
    const [mapOpen, setMapOpen] = useState(true)

    // Solo filas con coordenadas válidas
    const validRowsForMap = useMemo(
        () =>
            filteredData.filter(
                (r) => Number.isFinite(r.latitud) && Number.isFinite(r.longitud)
            ),
        [filteredData]
    )

    const markersCount = validRowsForMap.length

    // Doble click en el mapa → aplica filtro de coordenadas a la tabla
    const handleMapPointDblClick = useCallback(
        (lat: number, lng: number) => {
            setMapOpen(false)
            const lat6 = Number(lat.toFixed(6))
            const lng6 = Number(lng.toFixed(6))
            setCoordFilter({ lat: lat6, lng: lng6 })
        },
        [setCoordFilter]
    )

    const clearCoordFilters = useCallback(() => {
        setCoordFilter(null)
    }, [setCoordFilter])

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
