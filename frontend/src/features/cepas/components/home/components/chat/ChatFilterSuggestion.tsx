// ChatFilterSuggestion.tsx
import { useState } from "react"
import { Filter, Check } from "lucide-react"

// Convierte cualquier campo dinámico a un label legible
function fieldLabel(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

type Props = {
    filtros: Record<string, string>
    onApply: (filtros: Record<string, string>) => void
}

export default function ChatFilterSuggestion({ filtros, onApply }: Props) {
    const [applied, setApplied] = useState(false)

    const entries = Object.entries(filtros)
    if (entries.length === 0) return null

    const handleApply = () => {
        onApply(filtros)
        setApplied(true)
    }

    return (
        <div className="cp-filter-card">
            <div className="cp-filter-card-header">
                <Filter size={11} />
                <span>Filtros detectados</span>
            </div>
            <div className="cp-filter-chips">
                {entries.map(([key, val]) => (
                    <span key={key} className="cp-filter-chip">
                        <span className="cp-filter-chip-key">{fieldLabel(key)}</span>
                        <span className="cp-filter-chip-sep">:</span>
                        <span className="cp-filter-chip-val">{val}</span>
                    </span>
                ))}
            </div>
            <button
                className={`cp-filter-apply-btn${applied ? " cp-filter-applied" : ""}`}
                onClick={handleApply}
                disabled={applied}
            >
                {applied ? (
                    <>
                        <Check size={11} />
                        <span>Aplicado</span>
                    </>
                ) : (
                    <>
                        <Filter size={11} />
                        <span>Aplicar en tabla</span>
                    </>
                )}
            </button>
        </div>
    )
}
