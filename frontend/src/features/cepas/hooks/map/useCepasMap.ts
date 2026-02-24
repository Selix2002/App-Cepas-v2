// src/features/cepas/hooks/useCepasMap.ts
import { useState, useMemo, useCallback } from "react";
import type { GridApi } from "ag-grid-community";

export type CoordFilter = { lat: number; lng: number };

type UseCepasMapParams = {
    gridApi?: GridApi;
    rawTableData: any[];
    filterVersion: number;
};

export function useCepasMap({
    gridApi,
    rawTableData,
    filterVersion,
}: UseCepasMapParams) {
    // Estado del panel y del filtro por coordenadas
    const [mapOpen, setMapOpen] = useState(true);
    const [coordFilter, setCoordFilter] = useState<CoordFilter | null>(null);

    // Filas visibles en la grid (respeta filtros activos)
    const visibleRows = useMemo(() => {
        if (!gridApi) return rawTableData;

        const rows: any[] = [];
        if (gridApi.isAnyFilterPresent()) {
            gridApi.forEachNodeAfterFilter((n) => rows.push(n.data));
        } else {
            gridApi.forEachNode((n) => rows.push(n.data));
        }
        return rows;
    }, [gridApi, rawTableData, filterVersion]);

    // Filas con coordenadas válidas para el mapa
    const validRowsForMap = useMemo(() => {
        return visibleRows.filter(
            (r) =>
                Number.isFinite(Number(r?.latitud)) &&
                Number.isFinite(Number(r?.longitud))
        );
    }, [visibleRows]);

    // Conteo de marcadores válidos
    const markersCount = useMemo(() => {
        return validRowsForMap.length;
    }, [validRowsForMap]);

    // Doble click en un punto del mapa → aplicar filtros en la grid
    const handleMapPointDblClick = useCallback(
        (lat: number, lng: number) => {
            // cerrar panel
            setMapOpen(false);

            if (!gridApi) return;

            // redondeo consistente con la agrupación (6 decimales)
            const lat6 = Number(lat.toFixed(6));
            const lng6 = Number(lng.toFixed(6));

            // aplicar filtros para columnas latitud y longitud
            const current = gridApi.getFilterModel() || {};
            const nextModel = {
                ...current,
                latitud: { filterType: "number", type: "equals", filter: lat6 },
                longitud: { filterType: "number", type: "equals", filter: lng6 },
            };
            gridApi.setFilterModel(nextModel);
            gridApi.onFilterChanged();

            // garantizar visibilidad de columnas
            gridApi.setColumnsVisible(["latitud", "longitud"], true);

            // mostrar chip
            setCoordFilter({ lat: lat6, lng: lng6 });
        },
        [gridApi]
    );

    const clearCoordFilters = useCallback(() => {
        if (!gridApi) return;
        const model = { ...(gridApi.getFilterModel() || {}) };
        delete (model as any).latitud;
        delete (model as any).longitud;
        gridApi.setFilterModel(model);
        gridApi.onFilterChanged();
        setCoordFilter(null);
    }, [gridApi]);

    return {
        mapOpen,
        setMapOpen,
        coordFilter,
        validRowsForMap,
        markersCount,
        handleMapPointDblClick,
        clearCoordFilters,
    };
}
