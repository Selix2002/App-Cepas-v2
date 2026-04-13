// src/features/cepas/components/CepasTable/CepasSidebar.tsx
// Cada fila tiene:
//   [checkbox visibilidad] [dot color gráfico] [nombre columna]
// Checkbox → oculta/muestra columna (persiste en localStorage)
// Dot      → selecciona columna para el gráfico

import type { CepaColumnDef } from "../../types/tableTypes"
import type { ColumnSelection } from "../../hooks/charts/useCepasCharts"
import "./bioTable.css"

const DOT_COLORS = [
    "#00e5b4", "#4d9fff", "#ff8c42", "#a78bfa", "#ff4d6d",
    "#00c4a0", "#3a8aff", "#ffb347", "#c084fc", "#ff6b8a",
    "#00a888", "#2878dd", "#ff9830", "#9060e0", "#ff5277",
]
const dc = (i: number) => DOT_COLORS[i % DOT_COLORS.length]

interface Props {
    columnDefs: CepaColumnDef[]
    hiddenFields: Set<string>
    toggleColumnVisibility: (field: string, visible: boolean) => void
    selectedColumns: ColumnSelection[]
    onColumnToggle: (col: ColumnSelection, checked: boolean) => void
    collapsed?: boolean
    onToggle?: () => void
}

export default function CepasSidebar({
    columnDefs,
    hiddenFields,
    toggleColumnVisibility,
    selectedColumns,
    onColumnToggle,
    collapsed = false,
    onToggle,
}: Props) {
    const isSelected = (field: string) => selectedColumns.some((c) => c.field === field)

    return (
        <div className={`bio-sidebar${collapsed ? " bio-sidebar--collapsed" : ""}`}>

            {/* ── toggle button ──────────────────────────────────────────────── */}
            <button
                className="bio-sidebar-toggle"
                onClick={onToggle}
                title={collapsed ? "Expandir panel" : "Ocultar panel"}
            >
                {collapsed ? "▶" : "◀"}
            </button>

            {/* ── header ─────────────────────────────────────────────────────── */}
            {!collapsed && <div className="bio-sidebar-section">Columnas</div>}

            {/* ── select / deselect all ────────────────────────────────────────── */}
            {!collapsed && <div
                style={{
                    display: "flex",
                    gap: 6,
                    padding: "4px 14px 6px",
                    borderBottom: "1px solid #0f2020",
                }}
            >
                <button
                    onClick={() =>
                        columnDefs.forEach((c) => {
                            if (hiddenFields.has(c.field))
                                toggleColumnVisibility(c.field, true)
                        })
                    }
                    style={{
                        flex: 1,
                        background: "transparent",
                        border: "1px solid #1a2f28",
                        borderRadius: 3,
                        color: "#3a6a5a",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        cursor: "pointer",
                        padding: "3px 0",
                        fontFamily: "inherit",
                        transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#00b48e"
                        e.currentTarget.style.color = "#00e5b4"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#1a2f28"
                        e.currentTarget.style.color = "#3a6a5a"
                    }}
                    title="Mostrar todas las columnas"
                >
                    TODO
                </button>
                <button
                    onClick={() =>
                        columnDefs.forEach((c) => {
                            if (!hiddenFields.has(c.field))
                                toggleColumnVisibility(c.field, false)
                        })
                    }
                    style={{
                        flex: 1,
                        background: "transparent",
                        border: "1px solid #1a2f28",
                        borderRadius: 3,
                        color: "#3a6a5a",
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 1,
                        cursor: "pointer",
                        padding: "3px 0",
                        fontFamily: "inherit",
                        transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#ff4d6d66"
                        e.currentTarget.style.color = "#ff4d6d"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#1a2f28"
                        e.currentTarget.style.color = "#3a6a5a"
                    }}
                    title="Ocultar todas las columnas"
                >
                    NINGUNA
                </button>
            </div>}

            {/* ── column list ──────────────────────────────────────────────────── */}
            {!collapsed && <div className="bio-sidebar-scroll">
                {columnDefs.map((col, i) => {
                    const sel = isSelected(col.field)
                    const hidden = hiddenFields.has(col.field)
                    const color = dc(i)

                    return (
                        <div
                            key={col.field}
                            className={`bio-col-item${sel ? " active" : ""}`}
                            style={{ opacity: hidden ? 0.45 : 1, gap: 7 }}
                            title={col.headerName}
                        >
                            {/* ── checkbox: visibilidad ─────────────────────────────────── */}
                            <div
                                onClick={() => toggleColumnVisibility(col.field, hidden)}
                                title={hidden ? "Mostrar columna" : "Ocultar columna"}
                                style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 2,
                                    border: hidden ? "1px solid #3a6a5a" : "1px solid #00b48e",
                                    background: hidden ? "transparent" : "#00e5b422",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "background 0.15s, border-color 0.15s",
                                }}
                            >
                                {!hidden && (
                                    <span
                                        style={{
                                            fontSize: 8,
                                            color: "#00e5b4",
                                            lineHeight: 1,
                                            fontWeight: 900,
                                        }}
                                    >
                                        ✓
                                    </span>
                                )}
                            </div>

                            {/* ── dot: selección para gráfico ──────────────────────────── */}
                            <div
                                className="bio-col-dot"
                                style={{
                                    background: color,
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    opacity: hidden ? 0.3 : 1,
                                    boxShadow: sel ? `0 0 6px ${color}88` : "none",
                                    transition: "box-shadow 0.2s",
                                }}
                                onClick={() =>
                                    !hidden &&
                                    onColumnToggle(
                                        { field: col.field, name: col.headerName },
                                        !sel
                                    )
                                }
                                title={
                                    hidden
                                        ? "Muestra la columna primero"
                                        : sel
                                            ? "Quitar del gráfico"
                                            : "Añadir al gráfico"
                                }
                            />

                            {/* ── nombre ───────────────────────────────────────────────── */}
                            <span
                                className="bio-col-name"
                                style={{ flex: 1, cursor: "pointer" }}
                                onClick={() =>
                                    !hidden &&
                                    onColumnToggle(
                                        { field: col.field, name: col.headerName },
                                        !sel
                                    )
                                }
                            >
                                {col.headerName}
                            </span>
                        </div>
                    )
                })}
            </div>}
        </div>
    )
}
