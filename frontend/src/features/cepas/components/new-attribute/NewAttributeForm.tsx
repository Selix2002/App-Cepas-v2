// src/features/cepas/components/new-attribute/NewAttributeForm.tsx
import type React from "react"
import { useState } from "react"
import SectionSelect, { saveSectionAssignment } from "./SectionSelect"
import "./new-attribute.css"

type CepaLite = { id: string; nombre: string }

type Props = {
    cepas: CepaLite[]
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void
    onSubmit: () => void
}

export default function NewAttributeForm({
    cepas,
    inputRefs,
    onKeyDown,
    onSubmit,
}: Props) {
    const [sectionId, setSectionId] = useState("")

    // Al enviar, persiste la asignación de sección en localStorage
    const handleSubmit = () => {
        const attributeName = inputRefs.current[0]?.value?.trim()
        if (!attributeName) return
        saveSectionAssignment(attributeName, sectionId)
        onSubmit()
    }

    const canSubmit = true // validación real en el hook

    return (
        <>
            <div className="na-content">

                {/* ── configuración ── */}
                <div className="na-card">
                    <div className="na-card-header">
                        <div className="na-card-dot" style={{ background: "#00e5b4" }} />
                        <span className="na-card-title">Configuración del atributo</span>
                    </div>

                    <div className="na-config-grid">
                        {/* nombre */}
                        <div className="na-config-field">
                            <label className="na-label required" htmlFor="attribute_name">
                                Nombre del atributo
                            </label>
                            <input
                                id="attribute_name"
                                name="attribute_name"
                                type="text"
                                className="na-input"
                                placeholder="ej. pH óptimo"
                                ref={(el) => { inputRefs.current[0] = el }}
                                onKeyDown={(e) => onKeyDown(e, 0)}
                            />
                        </div>

                        {/* sección */}
                        <div className="na-config-field">
                            <label className="na-label">
                                Asignar a sección en Nueva Cepa
                            </label>
                            <SectionSelect value={sectionId} onChange={setSectionId} />
                        </div>
                    </div>
                </div>

                {/* ── valores por cepa ── */}
                <div className="na-card">
                    <div className="na-card-header">
                        <div className="na-card-dot" style={{ background: "#4d9fff" }} />
                        <span className="na-card-title">Valores por cepa</span>
                        <span className="na-card-count">
                            {cepas.length} {cepas.length === 1 ? "cepa" : "cepas"} &nbsp;·&nbsp; vacío = N/I
                        </span>
                    </div>

                    <div className="na-cepas-grid">
                        {cepas.map((cepa, idx) => (
                            <div key={cepa.id} className="na-cepa-field">
                                <span className="na-cepa-name" title={cepa.nombre}>
                                    {cepa.nombre}
                                </span>
                                <input
                                    type="text"
                                    className="na-cepa-input"
                                    placeholder="valor o N/I"
                                    ref={(el) => { inputRefs.current[idx + 1] = el }}
                                    onKeyDown={(e) => onKeyDown(e, idx + 1)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* footer sticky */}
            <div className="na-footer">
                <span className="na-footer-hint">
                    Enter para avanzar &nbsp;·&nbsp; vacío = N/I &nbsp;·&nbsp; * requerido
                </span>
                <button
                    type="button"
                    className="na-btn-submit"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                >
                    + Añadir Atributo
                </button>
            </div>
        </>
    )
}
