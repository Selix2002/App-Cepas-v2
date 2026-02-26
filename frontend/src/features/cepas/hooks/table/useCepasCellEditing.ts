import { useCallback } from "react"
import type { CellValueChangedEvent } from "ag-grid-community"
import { updateCepa } from "../../services/CepasQuery"
import type { NotificationState } from "./useCepasTableData"
import type { User, CepaUpdate } from "../../../../shared/interfaces"

const FILTER_ROW_ID = "__filter__"

type UseCepasCellEditingArgs = {
    setRowData: React.Dispatch<React.SetStateAction<any[]>>
    setNotification: React.Dispatch<React.SetStateAction<NotificationState>>
    user: User | null | undefined
}

export function useCepasCellEditing({
    setRowData,
    setNotification,
    user,
}: UseCepasCellEditingArgs) {

    const showNotification = (text: string, type: "success" | "error") => {
        setNotification({ text, type })
        setTimeout(() => setNotification(null), 3000)
    }

    const handleCellValueChanged = async (params: CellValueChangedEvent) => {
        if (params.data.id === FILTER_ROW_ID) return
        if (params.oldValue === params.newValue) return

        const field = params.colDef.field as string
        if (!field) return

        // Valor vacío → null en backend (string vacío se interpreta como null)
        const rawValue = params.newValue
        const newValue = typeof rawValue === "string" ? rawValue.trim() : rawValue

        const updatedRow = params.data

        try {
            const payload: CepaUpdate = { [field]: newValue === "" ? null : newValue }
            const updated = await updateCepa(updatedRow.id, payload)

            // Actualizar estado local con la respuesta del backend
            setRowData((rows) =>
                rows.map((r) => (r.id === updatedRow.id ? { ...r, ...updated } : r))
            )
            showNotification("Cambios guardados con éxito", "success")
        } catch (err) {
            console.error(err)
            // Revertir el valor en la celda al valor anterior
            params.node.setDataValue(field, params.oldValue)
            showNotification("Hubo un error al guardar los cambios", "error")
        }
    }

    const isCellEditable = useCallback(
        (params: any) => {
            if (params.data?.id === FILTER_ROW_ID) return false
            return user?.is_admin ?? false   // era isAdmin
        },
        [user]
    )

    return {
        handleCellValueChanged,
        isCellEditable,
    }
}