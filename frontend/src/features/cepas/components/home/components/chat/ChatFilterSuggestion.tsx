// ChatFilterSuggestion.tsx
import { useState } from "react"
import { Filter, Check } from "lucide-react"

const FIELD_LABELS: Record<string, string> = {
    gram: "Gram",
    lecitinasa: "Lecitinasa",
    ureasa: "Ureasa",
    lipasa: "Lipasa",
    amilasa: "Amilasa",
    proteasa: "Proteasa",
    catalasa: "Catalasa",
    celulasa: "Celulasa",
    fosfatasa: "Fosfatasa",
    aia: "AIA",
    temp_5c: "Temp 5°C",
    temp_25c: "Temp 25°C",
    temp_37c: "Temp 37°C",
    amp: "Ampicilina",
    ctx: "Cefotaxima",
    cxm: "Cefuroxima",
    caz: "Ceftazidima",
    ak: "Amikacina",
    c: "Cloranfenicol",
    te: "Tetraciclina",
    am_ecoli: "AM E.coli",
    am_saureus: "AM S.aureus",
    origen: "Origen",
    morfologia_1: "Morfología 1",
    morfologia_2: "Morfología 2",
    pigmentacion: "Pigmentación",
}

function fieldLabel(key: string): string {
    return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
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
