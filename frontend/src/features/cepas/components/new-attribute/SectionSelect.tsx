// src/features/cepas/components/new-attribute/SectionSelect.tsx
import { useState, useEffect, useRef } from "react"
import "./new-attribute.css"

// Debe coincidir exactamente con los IDs de SECTIONS en NewCepaForm.tsx
export const SECTION_OPTIONS = [
    { id: "", label: "Sin sección — Otros atributos", color: "#78909c" },
    { id: "identificacion", label: "Identificación", color: "#00e5b4" },
    { id: "ubicacion", label: "Ubicación", color: "#4d9fff" },
    { id: "caracteristicas", label: "Características", color: "#ff8c42" },
    { id: "almacenamiento", label: "Almacenamiento", color: "#00c4a0" },
    { id: "enzimatica", label: "Actividad enzimática", color: "#a78bfa" },
    { id: "temperatura", label: "Temperatura de crecimiento", color: "#ffb347" },
    { id: "antibiotica", label: "Resistencia antibiótica", color: "#ff4d6d" },
    { id: "genetica", label: "Genética y proyectos", color: "#c084fc" },
]

// localStorage key para persistir asignaciones
export const SECTION_STORAGE_KEY = "nc_section_assignments"

export function getSectionAssignments(): Record<string, string> {
    try {
        const raw = localStorage.getItem(SECTION_STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

export function saveSectionAssignment(attributeName: string, sectionId: string) {
    const assignments = getSectionAssignments()
    if (sectionId) {
        assignments[attributeName] = sectionId
    } else {
        delete assignments[attributeName]
    }
    localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(assignments))
}

interface Props {
    value: string
    onChange: (sectionId: string) => void
}

export default function SectionSelect({ value, onChange }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const wrapRef = useRef<HTMLDivElement>(null)

    const selected = SECTION_OPTIONS.find((o) => o.id === value) ?? SECTION_OPTIONS[0]

    // Cierra al click exterior
    useEffect(() => {
        if (!isOpen) return
        function handler(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [isOpen])

    const select = (opt: typeof SECTION_OPTIONS[0]) => {
        onChange(opt.id)
        setIsOpen(false)
    }

    const pillLabel = value ? selected.label : "Otros atributos"
    const pillHint = value
        ? "el campo aparecerá en esta sección"
        : "el campo no se asignará a ninguna sección"

    return (
        <div>
            <div className="na-select-wrap" ref={wrapRef}>
                {/* trigger button */}
                <button
                    type="button"
                    className={`na-select-btn${isOpen ? " open" : ""}`}
                    onClick={() => setIsOpen((v) => !v)}
                >
                    <div
                        className="na-select-btn-dot"
                        style={{ background: selected.color }}
                    />
                    <span className="na-select-btn-label">{selected.label}</span>
                    <span className="na-select-btn-arrow">▼</span>
                </button>

                {/* dropdown */}
                <div className={`na-dropdown${isOpen ? " open" : ""}`}>
                    {SECTION_OPTIONS.map((opt) => (
                        <div
                            key={opt.id || "none"}
                            className={`na-option${opt.id === value ? " selected" : ""}`}
                            onClick={() => select(opt)}
                        >
                            <div className="na-option-dot" style={{ background: opt.color }} />
                            <span className="na-option-label">{opt.label}</span>
                            {opt.id === value && <span className="na-option-check">✓</span>}
                        </div>
                    ))}
                </div>
            </div>

            {/* pill preview */}
            <div className="na-pill-wrap">
                <div
                    className="na-pill"
                    style={{
                        background: selected.color + "22",
                        borderColor: selected.color + "44",
                    }}
                >
                    <div className="na-pill-dot" style={{ background: selected.color }} />
                    <span className="na-pill-label" style={{ color: selected.color }}>
                        {pillLabel}
                    </span>
                </div>
                <span className="na-pill-hint">{pillHint}</span>
            </div>
        </div>
    )
}
