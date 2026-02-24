// src/features/cepas/hooks/useCepasGrid.ts
import { useState, useEffect, useCallback } from "react";
import type { GridApi, Column } from "ag-grid-community";
import type { GridReadyCallback } from "../../components/CepasTable";
import { exportToExcel } from "../../../../shared/utils/exportExcel";
import { updateVisibleCol } from "../../../users/services/UsersQuery";
import type { User } from "../../../../shared/interfaces";

type UseCepasGridParams = {
    user: User | null;
};

export function useCepasGrid({ user }: UseCepasGridParams) {
    const [gridApi, setGridApi] = useState<GridApi | undefined>(undefined);
    const [columns, setColumns] = useState<Column[]>([]);
    const [rawTableData, setRawTableData] = useState<any[]>([]);
    const [filterVersion, setFilterVersion] = useState(0);
    const [refreshToken, setRefreshToken] = useState(0);

    // Cuando la tabla carga datos
    const handleDataLoaded = useCallback((data: any[]) => {
        setRawTableData(data);
    }, []);

    // Cuando cambian filtros en AG Grid
    const handleFilterChanged = useCallback(() => {
        setFilterVersion((v) => v + 1);
    }, []);

    // Suscribir y desuscribir evento de filtros
    useEffect(() => {
        if (!gridApi) return;

        const listener = () => {
            setFilterVersion((v) => v + 1);
        };

        gridApi.addEventListener("filterChanged", listener);

        return () => {
            // Si la api no existe o la grid ya fue destruida, no intentes quitar listeners
            if (!gridApi || gridApi.isDestroyed?.()) {
                return;
            }
            gridApi.removeEventListener("filterChanged", listener);
        };
    }, [gridApi, handleFilterChanged]);

    // Cuando la grid está lista
    const handleGridReady: GridReadyCallback = (params) => {
        const api = params.api;
        setGridApi(api);

        // Ocultar columnas según preferencias del usuario
        if (user?.hiddenColumns && user.hiddenColumns.length > 0) {
            const columnsToHide = user.hiddenColumns.map(String);
            api.setColumnsVisible(columnsToHide, false);
        }

        setColumns(api.getColumns() ?? []);
    };

    // Exportar a Excel
    const handleExport = () => {
        if (!gridApi) return;
        exportToExcel(gridApi, "Cepas", "cepas.xlsx");
    };

    // Mostrar/ocultar columna y persistir en backend
    const handleToggleColumnVisibility = async (
        colId: string,
        visible: boolean
    ) => {
        if (!gridApi || !user?.id) return;

        gridApi.setColumnsVisible([colId], visible);
        setColumns(gridApi.getColumns() ?? []);

        const allCols = gridApi.getColumns() ?? [];
        const hiddenColumns = allCols
            .filter((c) => !c.isVisible())
            .map((c) => c.getColId());

        try {
            await updateVisibleCol(user.id, hiddenColumns);
        } catch (error) {
            console.error("Error al guardar la visibilidad de las columnas:", error);
        }
    };

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
    };
}
