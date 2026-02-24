// src/features/cepas/hooks/useCepasCellEditing.ts
import { useCallback } from "react";
import type { CellValueChangedEvent } from "ag-grid-community";

import { actualizarCepaPorCampo } from "../../services/cepaUpdate";
import { updateCepasJSONB_forTable } from "../../services/CepasQuery";
import type { NotificationState } from "./useCepasTableData";
import type { User } from "../../../../shared/interfaces";

const filterRowId = 0;

type UseCepasCellEditingArgs = {
    rowData: any[];
    setRowData: React.Dispatch<React.SetStateAction<any[]>>;
    setNotification: React.Dispatch<React.SetStateAction<NotificationState>>;
    user: User | null | undefined;
};

export function useCepasCellEditing({
    rowData,
    setRowData,
    setNotification,
    user,
}: UseCepasCellEditingArgs) {
    const handleCellValueChanged = async (params: CellValueChangedEvent) => {
        // Evitar cambios en la fila de filtros
        if (params.data.id === filterRowId) return;
        // Evitar disparar si no cambió el valor
        if (params.oldValue === params.newValue) return;

        const updatedRow = params.data;
        const field = params.colDef.field as string;
        const rawValue = params.newValue;
        const texto =
            typeof rawValue === "string" ? rawValue.trim() : String(rawValue).trim();

        if (!texto || texto.toLowerCase() === "null") {
            setNotification({
                text: 'No se puede dejar la casilla vacía; si quieres vaciarla, escribe "N/I"',
                type: "error",
            });
            setTimeout(() => setNotification(null), 3000);
            return;
        }

        const JSONB_PREFIX = "datos_extra.";
        const isJSONBField = field.startsWith(JSONB_PREFIX);
        const jsonKey = isJSONBField ? field.slice(JSONB_PREFIX.length) : "";

        try {
            if (isJSONBField) {
                // Construimos un mapa nombreCepa -> datos_extra existentes
                const existingDatosExtras = rowData.reduce<
                    Record<string, Record<string, any>>
                >((acc, row) => {
                    acc[row.nombre] = row.datos_extra ?? {};
                    return acc;
                }, {});

                const merged = {
                    ...existingDatosExtras[updatedRow.nombre],
                    [jsonKey]: texto,
                };

                await updateCepasJSONB_forTable(
                    { attribute_name: jsonKey, [updatedRow.nombre]: texto },
                    existingDatosExtras
                );

                // Actualizamos el estado local de la fila
                setRowData((rows) =>
                    rows.map((r) =>
                        r.nombre === updatedRow.nombre ? { ...r, datos_extra: merged } : r
                    )
                );
            } else {
                // Campo "normal"
                await actualizarCepaPorCampo(updatedRow.id, field, texto);
                setRowData((rows) =>
                    rows.map((r) =>
                        r.id === updatedRow.id ? { ...r, [field]: texto } : r
                    )
                );
            }

            setNotification({ text: "Cambios guardados con éxito", type: "success" });
        } catch (err) {
            console.error(err);
            setNotification({
                text: "Hubo un error al guardar los cambios",
                type: "error",
            });
        } finally {
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const isCellEditable = useCallback(
        (params: any) => {
            // La fila de selectores no es editable.
            if (params.data && params.data.id === filterRowId) {
                return false;
            }
            // Sólo admin puede editar
            return user?.isAdmin ?? false;
        },
        [user]
    );

    return {
        handleCellValueChanged,
        isCellEditable,
    };
}
