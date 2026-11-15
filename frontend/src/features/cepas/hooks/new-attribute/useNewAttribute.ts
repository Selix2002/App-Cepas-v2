// src/features/cepas/hooks/new-attribute/useNewAttribute.ts
import { useEffect, useRef, useState } from "react"
import type React from "react"
import { getCepas, addAttribute } from "../../services/CepasQuery"
import type { Cepa } from "../../../../shared/interfaces"
import { loader } from "../../../../shared/utils/loader"
import { getApiErrorMessage } from "../../../../shared/utils/apiError"
import { saveSectionAssignment } from "../../components/new-attribute/SectionSelect"

type CepaLite = { id: string; nombre: string }

export function useNewAttribute() {
    const [cepas, setCepas] = useState<CepaLite[]>([])
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [modalData, setModalData] = useState<Record<string, string>>({})

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    // Sección elegida en el formulario; se persiste recién cuando el alta tiene éxito
    const pendingSection = useRef("")

    // Carga la lista de cepas al montar
    useEffect(() => {
        setLoading(true)
        loader(true)
        getCepas()
            .then(({ items }) => {
                setCepas(items.map((c: Cepa) => ({ id: c.id, nombre: c.cepa })))
            })
            .catch((err) => console.error("Error cargando cepas:", err))
            .finally(() => {
                setLoading(false)
                loader(false)
            })
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Enter") {
            e.preventDefault()
            inputRefs.current[index + 1]?.focus()
        }
    }

    // Lee los inputs y abre el modal de confirmación
    const confirmFromInputs = (sectionId: string) => {
        pendingSection.current = sectionId
        const attributeName = inputRefs.current[0]?.value?.trim()
        if (!attributeName) {
            alert('Debes ingresar un nombre para el atributo.')
            return
        }

        const data: Record<string, string> = { attribute_name: attributeName }
        cepas.forEach((cepa, idx) => {
            const val = inputRefs.current[idx + 1]?.value?.trim()
            data[cepa.nombre] = val ?? ""
        })

        setModalData(data)
        setShowModal(true)
    }

    // Envía al API tras confirmar en el modal
    const confirmSubmit = async () => {
        setShowModal(false)
        const { attribute_name, ...values } = modalData
        const nullableValues: Record<string, string | null> = {}
        for (const [k, v] of Object.entries(values)) {
            nullableValues[k] = v === "" ? null : v
        }

        setLoading(true)
        loader(true)
        try {
            const result = await addAttribute(attribute_name, nullableValues)
            // Se guarda con la clave interna (ej. "ph_optimo"), que es la que usa Nueva Cepa
            saveSectionAssignment(result.field, pendingSection.current)
            alert(`¡Atributo "${result.label}" añadido! (${result.updated} cepas actualizadas)`)
            inputRefs.current.forEach((el) => { if (el) el.value = "" })
        } catch (err: unknown) {
            alert(`Error al añadir: ${getApiErrorMessage(err)}`)
        } finally {
            setLoading(false)
            loader(false)
        }
    }

    const closeModal = () => setShowModal(false)

    return {
        cepas,
        loading,
        inputRefs,
        showModal,
        modalData,
        handleKeyDown,
        confirmFromInputs,
        confirmSubmit,
        closeModal,
    }
}
