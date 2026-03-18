// src/features/cepas/hooks/new-cepa/useNewCepa.ts
// Versión simplificada: eliminadas descarga de plantilla y subida de archivo.
import { useEffect, useRef, useState } from "react"
import type React from "react"

import { createCepa } from "../../services/CepasQuery"
import { getCepasColumnDefs } from "../../components/CepasColumns"
import type { CepaColumnDef } from "../../types/tableTypes"
import type { CepaCreate } from "../../../../shared/interfaces"
import { buildCepaPayloadFromFieldMap } from "../../utils/cepaPayload"

export function useNewCepa() {
    const [columns, setColumns] = useState<CepaColumnDef[]>([])
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Carga columnas estáticas al montar
    useEffect(() => {
        const defs = getCepasColumnDefs()
        setColumns(defs)

        const initial: Record<string, string> = {}
        defs
            .filter((col) => col.field !== "id")
            .forEach((col) => { initial[col.field] = "" })
        setFormData(initial)
    }, [])

    const handleInputChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Enter") {
            e.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
    }

    // Abre el modal de confirmación
    const addCepaFromForm = () => {
        setShowModal(true)
    }

    // Crea la cepa tras confirmar en el modal
    const confirmFromInputs = async () => {
        setLoading(true)
        try {
            const payload = buildCepaPayloadFromFieldMap(formData) as CepaCreate
            await createCepa(payload)
            alert("Cepa creada correctamente.")

            // Resetear formulario
            const defs = getCepasColumnDefs()
            const initial: Record<string, string> = {}
            defs.filter((c) => c.field !== "id").forEach((c) => { initial[c.field] = "" })
            setFormData(initial)
            setShowModal(false)
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error al crear la cepa")
        } finally {
            setLoading(false)
        }
    }

    const closeModal = () => setShowModal(false)

    return {
        columns,
        formData,
        inputRefs,
        showModal,
        loading,
        handleInputChange,
        handleKeyDown,
        addCepaFromForm,
        confirmFromInputs,
        closeModal,
    }
}
