// src/features/cepas/hooks/new-attribute/useNewAttribute.ts
// Versión simplificada: eliminadas descarga de plantilla y subida de archivo.
import { useEffect, useRef, useState } from "react"
import type React from "react"
import { getCepas, addAttribute } from "../../services/CepasQuery"
import type { Cepa } from "../../../../shared/interfaces"
import {loader} from "../../../../shared/utils/loader" // para mostrar spinner durante operaciones async

type CepaLite = { id: string; nombre: string }

export function useNewAttribute() {
    const [cepas, setCepas] = useState<CepaLite[]>([])
    const [loading, setLoading] = useState(false)

    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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

    // Lee el nombre del atributo (inputRefs[0]) y los valores por cepa (inputRefs[1..n])
    const confirmFromInputs = async () => {
        const attributeName = inputRefs.current[0]?.value?.trim()
        if (!attributeName) {
            alert('Debes ingresar un nombre para el atributo.')
            return
        }

        const dict: Record<string, string | null> = { attribute_name: attributeName }
        cepas.forEach((cepa, idx) => {
            const val = inputRefs.current[idx + 1]?.value?.trim()
            dict[cepa.nombre] = val || null   // vacío → null (N/I en backend)
        })

        setLoading(true)
        loader(true)
        try {
            const { attribute_name, ...values } = dict
            const result = await addAttribute(attribute_name!, values)
            alert(`¡Atributo añadido! (${result.updated} cepas actualizadas)`)
            // Resetear inputs
            inputRefs.current.forEach((el) => { if (el) el.value = "" })
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string }
            const detail = axiosErr?.response?.data?.detail ?? axiosErr?.message ?? "Error desconocido"
            alert(`Error al añadir: ${detail}`)
        } finally {
            setLoading(false)
            loader(false)
        }
    }

    return {
        cepas,
        loading,
        inputRefs,
        handleKeyDown,
        confirmFromInputs,
    }
}
