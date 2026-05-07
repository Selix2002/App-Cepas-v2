// src/features/cepas/components/CepasTable/CepasSidebar.tsx
// Cada fila tiene:
//   [drag handle] [checkbox visibilidad] [dot color gráfico] [nombre columna]
// Drag handle  → reordena columnas arrastrando
// Checkbox     → oculta/muestra columna (persiste en localStorage)
// Dot          → selecciona columna para el gráfico

import {
    DndContext, closestCenter, PointerSensor,
    useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { CepaColumnDef } from "../../types/tableTypes"
import type { ColumnSelection } from "../../hooks/charts/useCepasCharts"
import "./bioTable.css"

const DOT_COLORS = [
    "#00e5b4", "#4d9fff", "#ff8c42", "#a78bfa", "#ff4d6d",
    "#00c4a0", "#3a8aff", "#ffb347", "#c084fc", "#ff6b8a",
    "#00a888", "#2878dd", "#ff9830", "#9060e0", "#ff5277",
]
const dc = (i: number) => DOT_COLORS[i % DOT_COLORS.length]

// ─── SortableColumnItem ───────────────────────────────────────────────────────
interface ItemProps {
    col: CepaColumnDef
    index: number
    hidden: boolean
    sel: boolean
    color: string
    onToggleVisibility: () => void
    onColumnToggle: () => void
}

function SortableColumnItem({ col, hidden, sel, color, onToggleVisibility, onColumnToggle }: ItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: col.field,
        disabled: !!col.pinned,
    })

    return (
        <div
            ref={setNodeRef}
            className={`bio-col-item${sel ? " active" : ""}`}
            style={{
                opacity: isDragging ? 0.5 : hidden ? 0.45 : 1,
                transform: CSS.Transform.toString(transform),
                transition,
                gap: 7,
            }}
            title={col.headerName}
        >
            {/* drag handle */}
            {col.pinned ? (
                <span className="bio-col-drag-placeholder" />
            ) : (
                <span className="bio-col-drag-handle" {...attributes} {...listeners} title="Arrastrá para reordenar">⠿</span>
            )}

            {/* checkbox: visibilidad */}
            <div
                onClick={onToggleVisibility}
                title={hidden ? "Mostrar columna" : "Ocultar columna"}
                style={{
                    width: 12, height: 12, borderRadius: 2,
                    border: hidden ? "1px solid #3a6a5a" : "1px solid #00b48e",
                    background: hidden ? "transparent" : "#00e5b422",
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, border-color 0.15s",
                }}
            >
                {!hidden && <span style={{ fontSize: 8, color: "#00e5b4", lineHeight: 1, fontWeight: 900 }}>✓</span>}
            </div>

            {/* dot: selección para gráfico */}
            <div
                className="bio-col-dot"
                style={{
                    background: color, cursor: "pointer", flexShrink: 0,
                    opacity: hidden ? 0.3 : 1,
                    boxShadow: sel ? `0 0 6px ${color}88` : "none",
                    transition: "box-shadow 0.2s",
                }}
                onClick={() => !hidden && onColumnToggle()}
                title={hidden ? "Muestra la columna primero" : sel ? "Quitar del gráfico" : "Añadir al gráfico"}
            />

            {/* nombre */}
            <span
                className="bio-col-name"
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => !hidden && onColumnToggle()}
            >
                {col.headerName}
            </span>
        </div>
    )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    columnDefs: CepaColumnDef[]
    hiddenFields: Set<string>
    toggleColumnVisibility: (field: string, visible: boolean) => void
    selectedColumns: ColumnSelection[]
    onColumnToggle: (col: ColumnSelection, checked: boolean) => void
    reorderColumns: (activeId: string, overId: string) => void
    collapsed?: boolean
    onToggle?: () => void
}

export default function CepasSidebar({
    columnDefs,
    hiddenFields,
    toggleColumnVisibility,
    selectedColumns,
    onColumnToggle,
    reorderColumns,
    collapsed = false,
    onToggle,
}: Props) {
    const isSelected = (field: string) => selectedColumns.some((c) => c.field === field)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return
        reorderColumns(String(active.id), String(over.id))
    }

    const sortableIds = columnDefs.filter(c => !c.pinned).map(c => c.field)

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
            {!collapsed && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        <div className="bio-sidebar-scroll">
                            {columnDefs.map((col, i) => (
                                <SortableColumnItem
                                    key={col.field}
                                    col={col}
                                    index={i}
                                    hidden={hiddenFields.has(col.field)}
                                    sel={isSelected(col.field)}
                                    color={dc(i)}
                                    onToggleVisibility={() => toggleColumnVisibility(col.field, hiddenFields.has(col.field))}
                                    onColumnToggle={() => onColumnToggle({ field: col.field, name: col.headerName }, !isSelected(col.field))}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    )
}
