// src/features/cepas/hooks/new-cepa/useNewCepa.ts
import { useEffect, useRef, useState } from "react"
import type React from "react"

import { createCepa } from "../../services/CepasQuery"
import { getCepasColumnDefs } from "../../components/CepasColumns"
import type { CepaColumnDef } from "../../types/tableTypes"
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
    const [columns, setColumns] = useState<CepaColumnDef[]>([])
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [fileData, setFileData] = useState<Record<string, string>>({})
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)

    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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
                    .filter((col) => col.field !== "id")
                    .map((col) => col.headerName)

                const parsed = parseCepaFile(text, expectedKeys)
                const normalized = normalizeCepaParsedData(parsed)
                setFileData(normalized)
                setShowModal(true)
            } catch (err) {
                alert(err instanceof Error ? err.message : "Error al procesar el archivo")
            }
        }
        reader.readAsText(file)
        e.target.value = ""
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFileUpload(e)
    }

    const confirmFromFile = async () => {
        setLoading(true)
        try {
            const payload = buildCepaPayloadFromHeaderMap(fileData, columns) as CepaCreate
            await createCepa(payload)
            alert("Cepa creada correctamente desde archivo.")
            setShowModal(false)
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error al crear la cepa")
        } finally {
            setLoading(false)
        }
    }

    const confirmFromInputs = async () => {
        setLoading(true)
        try {
            const payload = buildCepaPayloadFromFieldMap(formData) as CepaCreate
            await createCepa(payload)
            alert("Cepa creada correctamente.")
            const defs = getCepasColumnDefs()
            const initial: Record<string, string> = {}
            defs.filter((c) => c.field !== "id").forEach((c) => { initial[c.field] = "" })
            setFormData(initial)
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error al crear la cepa")
        } finally {
            setLoading(false)
        }
    }

    const closeModal = () => setShowModal(false)

    const addCepaFromForm = () => setShowModal(true)

    const confirmFromModal = async () => {
        if (Object.keys(fileData).length > 0) {
            await confirmFromFile()
        } else {
            await confirmFromInputs()
        }
    }

    return {
        cepas: columns,
        columns,
        formData,
        fileData,
        inputRefs,
        fileInputRef,
        fileDict: fileData,
        showModal,
        loading,
        downloadTemplate,
        handleInputChange,
        handleFileUpload,
        handleFileChange,
        handleKeyDown,
        addCepaFromForm,
        confirmFromFile,
        confirmFromInputs,
        confirmFromModal,
        closeModal,
    }
}
