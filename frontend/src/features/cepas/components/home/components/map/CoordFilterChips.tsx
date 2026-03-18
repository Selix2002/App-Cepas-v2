// src/features/cepas/components/home/components/map/CoordFilterChips.tsx
import type { CoordFilter } from "../../../../types/tableTypes"
import "./coord-filter-chips.css"

interface Props {
    coordFilter: CoordFilter | null
    onClear: () => void
}

export default function CoordFilterChips({ coordFilter, onClear }: Props) {
    if (!coordFilter) return null

    return (
        <div className="cfc-bar">
            <span className="cfc-chip">
                <span className="cfc-chip-icon">📍</span>
                Coordenadas:
                <code>[{coordFilter.lat.toFixed(6)}, {coordFilter.lng.toFixed(6)}]</code>
            </span>
            <button className="cfc-clear-btn" onClick={onClear}>
                ✕ Limpiar filtro
            </button>
        </div>
    )
}
