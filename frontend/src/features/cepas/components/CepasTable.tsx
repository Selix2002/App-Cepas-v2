// src/features/cepas/components/CepasTable.tsx

import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { GridReadyEvent, ValueFormatterParams } from "ag-grid-community"

import { useAuth } from "../../auth/store/AuthContext";

import { useCepasTableData } from "../hooks/table/useCepasTableData";
import { useCepasCellEditing } from "../hooks/table/useCepasCellEditing";
import type { ColumnSelection } from "./table/CheckboxCellRenderer";

ModuleRegistry.registerModules([AllCommunityModule]);

export type GridReadyCallback = (params: GridReadyEvent) => void;

interface CepasTableProps {
  onGridReady?: GridReadyCallback;
  onDataLoaded: (data: any[]) => void;
  chartType: "pie" | "bar";
  onColumnToggle: (selection: ColumnSelection, checked: boolean) => void;
  selectedColumns: ColumnSelection[];
  refreshToken?: number;
}

export default function CepasTable({
  onGridReady,
  onDataLoaded,
  chartType,
  onColumnToggle,
  selectedColumns,
  refreshToken,
}: CepasTableProps) {
  const { user } = useAuth();

  const {
    rowData,
    setRowData,
    columnDefs,
    pinnedTopRowDataState,
    loading,
    error,
    notification,
    setNotification,
  } = useCepasTableData({
    onDataLoaded,
    chartType,
    onColumnToggle,
    selectedColumns,
    refreshToken,
  });

  const { handleCellValueChanged, isCellEditable } = useCepasCellEditing({
    setRowData,
    setNotification,
    user,
  });

  if (loading) return <div>Cargando cepas...</div>;
  if (error) return <div>Error al cargar datos: {error.message}</div>;

  return (
    <>
      {notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white px-4 py-2 rounded shadow">
          {notification.text}
        </div>
      )}

      <div className="relative h-full">
        <div className="ag-theme-alpine custom-space h-full">
          <AgGridReact
            columnDefs={columnDefs}
            rowData={rowData}
            theme="legacy"
            pinnedTopRowData={pinnedTopRowDataState}
            enableRowPinning={false}
            onGridReady={onGridReady}
            onCellValueChanged={handleCellValueChanged}
            defaultColDef={{
              minWidth: 100,
              filter: true,
              sortable: true,
              editable: isCellEditable,
              resizable: true,
              wrapHeaderText: true,
              valueFormatter: (params: ValueFormatterParams) => {
                if (params.data?.id === "__filter__") return ""
                if (params.value === null || params.value === undefined || params.value === "") return "N/I"
                return params.value
              },
            }}
            rowHeight={50}
            pagination
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 70, 100]}
            domLayout="normal"
          />
        </div>
      </div>
    </>
  );
}
