// src/features/cepas/hooks/useNewAttribute.ts
import { useEffect, useRef, useState } from "react"
import type React from "react"
import { getCepas, addAttribute } from "../../services/CepasQuery"
import { buildTemplateText, downloadTextFile, parseAttributeFile, validateAttributeDict } from "../../utils/attributeFile"
import type { Cepa } from "../../../../shared/interfaces"

type CepaLite = { id: string; nombre: string }

export function useNewAttribute() {
    const [cepas, setCepas] = useState<CepaLite[]>([])
    const [loading, setLoading] = useState(false)
    const [fileDict, setFileDict] = useState<Record<string, string>>({})
    const [showModal, setShowModal] = useState(false)

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        setLoading(true)
        getCepas()
            .then(({ items }) => {
                setCepas(items.map((c: Cepa) => ({ id: c.id, nombre: c.cepa })))
            })
            .catch((err) => console.error("Error cargando cepas:", err))
            .finally(() => setLoading(false))
    }, [])

    const downloadTemplate = () => {
        const text = buildTemplateText(cepas)
        downloadTextFile("template_addAttribute.txt", text)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const text = evt.target?.result
                if (typeof text !== "string") throw new Error("Archivo vacío o formato inválido")

                const dict = parseAttributeFile(text)
                validateAttributeDict(dict, cepas.map((c) => c.nombre))
                setFileDict(dict)
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Enter") {
            e.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
    }

    const confirmUpdate = async (dict: Record<string, string | null>) => {
        const { attribute_name, ...values } = dict
        if (!attribute_name) {
            alert('Debe ingresar un valor para "Nombre del atributo".')
            return
        }

        setLoading(true)
        try {
            const result = await addAttribute(attribute_name, values)
            alert(`¡Atributos añadidos con éxito! (${result.updated} cepas actualizadas)`)
            setFileDict({})
            setShowModal(false)
            inputRefs.current.forEach((el) => { if (el) el.value = "" })
        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? err?.message ?? "Error desconocido"
            alert(`Error al actualizar: ${detail}`)
        } finally {
            setLoading(false)
        }
    }

    const confirmFromFile = () => {
        if (!fileDict || Object.keys(fileDict).length === 0) {
            alert("No hay datos cargados desde archivo.")
            return
        }
        void confirmUpdate(fileDict)
    }

    const confirmFromInputs = () => {
        const attributeName = inputRefs.current[0]?.value?.trim()
        if (!attributeName) {
            alert('Debe ingresar un valor para "Nombre del atributo".')
            return
        }

        const dict: Record<string, string | null> = { attribute_name: attributeName }
        cepas.forEach((cepa, idx) => {
            const val = inputRefs.current[idx + 1]?.value?.trim()
            dict[cepa.nombre] = val || null   // vacío → null
        })

        void confirmUpdate(dict)
    }

    return {
        cepas,
        loading,
        inputRefs,
        fileInputRef,
        fileDict,
        showModal,
        downloadTemplate,
        handleFileChange,
        handleKeyDown,
        confirmFromFile,
        confirmFromInputs,
        closeModal: () => setShowModal(false),
    }
}
