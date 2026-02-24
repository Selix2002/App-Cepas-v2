// src/features/cepas/hooks/useCepasTableData.ts
import { useEffect, useState } from "react";
import type { ColDef } from "ag-grid-community";

import { loader } from "../../../../shared/utils/loader";
import { fetchCepasFull } from "../../services/CepasQuery";
import { getCepasColumnDefs } from "../../components/CepasColumns";
import CheckboxCellRenderer, {
    type ChartType,
    type ColumnSelection,
} from "../../components/table/CheckboxCellRenderer";

const filterRow = { id: 0 };

export type NotificationState = {
    text: string;
    type: "success" | "error";
} | null;

type UseCepasTableDataArgs = {
    onDataLoaded: (data: any[]) => void;
    chartType: ChartType;
    onColumnToggle: (selection: ColumnSelection, checked: boolean) => void;
    selectedColumns: ColumnSelection[];
    refreshToken?: number;
};

export function useCepasTableData({
    onDataLoaded,
    chartType,
    onColumnToggle,
    selectedColumns,
    refreshToken,
}: UseCepasTableDataArgs) {
    const [rowData, setRowData] = useState<any[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [pinnedTopRowDataState, setPinnedTopRowDataState] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [notification, setNotification] = useState<NotificationState>(null);

    // 1) Fetch de datos
    useEffect(() => {
        setLoading(true);
        loader(true);

        fetchCepasFull()
            .then((data) => {
                onDataLoaded(data);
                setRowData(data);
                setPinnedTopRowDataState([filterRow]);
            })
            .catch((err) => {
                setError(err);
            })
            .finally(() => {
                setLoading(false);
                loader(false);
            });
    }, [onDataLoaded, refreshToken]);

    // 2) Construcción de columnas (depende de rowData y selección de gráficos)
    useEffect(() => {
        if (rowData.length === 0) return;

        const baseColumnDefs = getCepasColumnDefs(rowData);
        const enhancedColumnDefs = baseColumnDefs.map((colDef) => ({
            ...colDef,
            cellRenderer: CheckboxCellRenderer,
            cellRendererParams: {
                chartType,
                onColumnToggle,
                selectedColumns,
            },
        }));

        setColumnDefs(enhancedColumnDefs);
    }, [rowData, chartType, onColumnToggle, selectedColumns]);

    return {
        rowData,
        setRowData,
        columnDefs,
        pinnedTopRowDataState,
        loading,
        error,
        notification,
        setNotification,
    };
}
