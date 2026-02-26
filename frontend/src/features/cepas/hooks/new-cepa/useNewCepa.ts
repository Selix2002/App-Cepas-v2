// src/features/cepas/hooks/useNewCepa.ts
import { useEffect, useRef, useState } from "react"
import type React from "react"
import type { ColDef } from "ag-grid-community"

import { createCepa } from "../../services/CepasQuery"
import { getCepasColumnDefs } from "../../components/CepasColumns"
import type { CepaCreate } from "../../../../shared/interfaces"
import {
    downloadCepaTemplate,
    parseCepaFile,
    normalizeCepaParsedData,
} from "../../utils/cepaFile"
import {
    buildCepaPayloadFromFieldMap,
    buildCepaPayloadFromHeaderMap,
} from "../../utils/cepaPayload"

export function useNewCepa() {
    const [columns, setColumns] = useState<ColDef[]>([])
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [fileData, setFileData] = useState<Record<string, string>>({})
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)

    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Columnas y formData inicial — ya no necesita fetch, las columnas son estáticas
    useEffect(() => {
        const defs = getCepasColumnDefs()
        setColumns(defs)

        const initial: Record<string, string> = {}
        defs
            .filter(
                (col): col is ColDef & { field: string } =>
                    typeof col.field === "string" && col.field !== "id"
            )
            .forEach((col) => {
                initial[col.field] = ""
            })
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

    const downloadTemplate = () => {
        if (!columns.length) {
            alert("No hay columnas disponibles para generar la plantilla.")
            return
        }
        downloadCepaTemplate(columns)
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result
                if (typeof text !== "string") throw new Error("Archivo vacío o formato inválido")

                const expectedKeys = columns
                    .filter(
                        (col): col is ColDef & { field: string } =>
                            typeof col.field === "string" && col.field !== "id"
                    )
                    .map((col) => col.headerName!)
                    .filter(Boolean)

                const parsed = parseCepaFile(text, expectedKeys)
                const normalized = normalizeCepaParsedData(parsed)

                setFormData((prev) => ({ ...prev, ...normalized }))
                setFileData(normalized)
                setShowModal(true)
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Error al procesar el archivo"
                alert(`Error al procesar el archivo: ${msg}`)
            } finally {
                e.target.value = ""
            }
        }
        reader.readAsText(file)
    }

    const addCepaFromForm = async (): Promise<void> => {
        setLoading(true)
        try {
            const payload = buildCepaPayloadFromFieldMap(formData) as CepaCreate
            await createCepa(payload)
            alert("Cepa creada con éxito")
            setFormData({})
            setFileData({})
        } catch (error) {
            console.error("Error al crear la cepa:", error)
            alert("Error al crear la cepa. Por favor, revisa la consola para más detalles.")
        } finally {
            setLoading(false)
        }
    }

    const confirmFromModal = async (): Promise<void> => {
        setLoading(true)
        try {
            const payload = buildCepaPayloadFromHeaderMap(formData, columns) as CepaCreate
            await createCepa(payload)
            alert("Cepa creada con éxito")
        } catch (error) {
            console.error("Error al crear la cepa:", error)
            alert("Error al crear la cepa. Por favor, revisa la consola para más detalles.")
        } finally {
            setLoading(false)
            setFormData({})
            setFileData({})
            inputRefs.current = []
            if (fileInputRef.current) fileInputRef.current.value = ""
            setShowModal(false)
        }
    }

    return {
        columns,
        formData,
        fileData,
        showModal,
        loading,
        fileInputRef,
        inputRefs,
        handleInputChange,
        handleKeyDown,
        downloadTemplate,
        handleFileUpload,
        addCepaFromForm,
        confirmFromModal,
        closeModal: () => setShowModal(false),
    }
}