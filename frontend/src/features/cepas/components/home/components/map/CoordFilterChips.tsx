// src/features/cepas/components/home/components/map/CoordFilterChips.tsx
import type { CoordFilter } from "../../../../types/tableTypes"

interface Props {
    coordFilter: CoordFilter | null
    onClear: () => void
}

export default function CoordFilterChips({ coordFilter, onClear }: Props) {
    if (!coordFilter) return null

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "5px 16px",
                background: "#0b1220",
                borderBottom: "1px solid #1a2f28",
                flexShrink: 0,
                fontFamily: "'Courier New', monospace",
            }}
        >
            <span
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 3,
                    border: "1px solid #00e5b433",
                    background: "#00e5b411",
                    padding: "2px 10px",
                    fontSize: 10,
                    color: "#8ab0a0",
                    letterSpacing: 0.5,
                }}
            >
                <span style={{ color: "#00e5b4", fontSize: 9 }}>📍</span>
                Coordenadas:
                <code style={{ color: "#00e5b4", fontSize: 10 }}>
                    [{coordFilter.lat.toFixed(6)}, {coordFilter.lng.toFixed(6)}]
                </code>
            </span>

            <button
                onClick={onClear}
                style={{
                    background: "transparent",
                    border: "1px solid #ff4d6d33",
                    borderRadius: 3,
                    color: "#ff4d6d",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: 0.5,
                }}
            >
                ✕ Limpiar filtro
            </button>
        </div>
    )
}
