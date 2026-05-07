// src/features/cepas/components/CepasTable/CepasTable.tsx
// El sidebar fue extraído a CepasSidebar.tsx — este componente solo renderiza
// la parte derecha (stats + búsqueda + tabla + paginación).

import { useRef, type KeyboardEvent } from "react"
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import "./bioTable.css"
import type { CepaColumnDef, SortConfig, NotificationState } from "../../types/tableTypes"
import type { Cepa } from "../../../../shared/interfaces"
import type { ColumnSelection } from "../../hooks/charts/useCepasCharts"

const DOT_COLORS = [
  "#00e5b4","#4d9fff","#ff8c42","#a78bfa","#ff4d6d",
  "#00c4a0","#3a8aff","#ffb347","#c084fc","#ff6b8a",
  "#00a888","#2878dd","#ff9830","#9060e0","#ff5277",
]
const dc = (i: number) => DOT_COLORS[i % DOT_COLORS.length]

function highlight(text: string, queries: string[]) {
  const raw = text === "" ? "N/I" : text
  const q = queries.find((q) => q && raw.toLowerCase().includes(q.toLowerCase()))
  if (!q) return <span>{raw}</span>
  const idx = raw.toLowerCase().indexOf(q.toLowerCase())
  return (
    <>
      {raw.slice(0, idx)}
      <span className="bio-hl">{raw.slice(idx, idx + q.length)}</span>
      {raw.slice(idx + q.length)}
    </>
  )
}

function CellValue({ value, queries }: { value: unknown; queries: string[] }) {
  const raw = String(value ?? "")
  if (raw === "+")            return <span className="bio-pill bio-pill-pos">+</span>
  if (raw === "–" || raw === "-") return <span className="bio-pill bio-pill-neg">–</span>
  if (raw === "N/I" || raw === "") return <span className="bio-pill bio-pill-ni">N/I</span>
  return <>{highlight(raw, queries)}</>
}

// ─── SortableTh ──────────────────────────────────────────────────────────────
interface SortableThProps {
  col: CepaColumnDef
  isSelected: boolean
  isSorted: boolean
  sortDir: "asc" | "desc"
  hasFilter: boolean
  color: string
  onSort: () => void
  onColumnToggle: () => void
}

function SortableTh({ col, isSelected, isSorted, sortDir, hasFilter, color, onSort, onColumnToggle }: SortableThProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.field })

  const classes = [
    isSelected ? "col-selected" : "",
    isSorted   ? "sorted"       : "",
    hasFilter && !isSelected ? "has-filter" : "",
    isDragging ? "bio-th-dragging" : "",
  ].filter(Boolean).join(" ")

  return (
    <th
      ref={setNodeRef}
      style={{
        width: col.width ?? 120,
        minWidth: col.width ?? 100,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: isDragging ? "relative" : undefined,
        zIndex:   isDragging ? 999 : undefined,
      }}
      className={classes}
      {...attributes}
      onClick={onSort}
    >
      <div className="bio-th-inner">
        <span
          className="bio-th-drag-handle"
          {...listeners}
          onClick={e => e.stopPropagation()}
          title="Arrastrá para reordenar"
        >⠿</span>
        <div
          className={`bio-col-checkbox${isSelected ? " bio-col-checkbox--active" : ""}`}
          style={{ "--col-color": color } as React.CSSProperties}
          onClick={e => { e.stopPropagation(); onColumnToggle() }}
          title={isSelected ? "Quitar del gráfico" : "Añadir al gráfico"}
        >
          {isSelected && <span className="bio-col-checkbox-check">✓</span>}
        </div>
        <span className="bio-th-text">{col.headerName}</span>
        <span className="bio-sort-arrow">
          {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
        {hasFilter && <span className="bio-filter-dot">●</span>}
      </div>
    </th>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface CepasTableProps {
  columnDefs: CepaColumnDef[]
  visibleColumnDefs: CepaColumnDef[]
  hiddenFields: Set<string>
  toggleColumnVisibility: (field: string, visible: boolean) => void

  displayData: Cepa[]
  filteredData: Cepa[]
  rawData: Cepa[]

  globalSearch: string
  setGlobalSearch: (q: string) => void
  columnFilters: Record<string, string>
  setColumnFilter: (field: string, val: string) => void
  clearColumnFilter: (field: string) => void
  clearAllFilters: () => void
  activeFilterCount: number

  sortConfig: SortConfig
  handleSort: (field: string) => void

  page: number
  pageSize: number
  totalPages: number
  setPage: (p: number) => void
  setPageSize: (ps: number) => void

  editingCell: { id: string; field: string; value: string } | null
  startEdit: (id: string, field: string, currentValue: string) => void
  handleEditChange: (value: string) => void
  commitEdit: () => Promise<void>
  cancelEdit: () => void
  isAdmin: boolean
  notification: NotificationState

  selectedColumns: ColumnSelection[]
  onColumnToggle: (col: ColumnSelection, checked: boolean) => void
  reorderColumns: (activeId: string, overId: string) => void
}

export default function CepasTable({
  columnDefs,
  visibleColumnDefs,
  displayData,
  filteredData,
  rawData,
  globalSearch,
  setGlobalSearch,
  columnFilters,
  setColumnFilter,
  clearColumnFilter,
  clearAllFilters,
  activeFilterCount,
  sortConfig,
  handleSort,
  page,
  pageSize,
  totalPages,
  setPage,
  setPageSize,
  editingCell,
  startEdit,
  handleEditChange,
  commitEdit,
  cancelEdit,
  isAdmin,
  notification,
  selectedColumns,
  onColumnToggle,
  reorderColumns,
}: CepasTableProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderColumns(String(active.id), String(over.id))
  }

  const isColSelectedForChart = (field: string) =>
    selectedColumns.some((c) => c.field === field)

  const uniqueValsForSelected = (field: string): number =>
    new Set(filteredData.map((r) => String(r[field as keyof Cepa] ?? "N/I"))).size

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")  commitEdit()
    if (e.key === "Escape") cancelEdit()
  }

  const hasColFilter = (field: string) => !!(columnFilters[field])

  const pinnedCol   = visibleColumnDefs.find((c) => c.pinned)
  const restCols    = visibleColumnDefs.filter((c) => !c.pinned)
  const orderedCols = pinnedCol ? [pinnedCol, ...restCols] : visibleColumnDefs

  const queries = [globalSearch, ...Object.values(columnFilters)].filter(Boolean)
  const colColorIndex = (field: string) => columnDefs.findIndex((c) => c.field === field)

  return (
    <div className="bio-main">

      {/* stats */}
      <div className="bio-stats-row">
        {[
          { val: rawData.length,      lbl: "Cepas totales" },
          { val: filteredData.length, lbl: "Mostrando" },
          { val: selectedColumns[0] ? uniqueValsForSelected(selectedColumns[0].field) : "—", lbl: "Categorías" },
          { val: activeFilterCount,   lbl: "Filtros activos" },
          { val: visibleColumnDefs.length, lbl: "Columnas visibles" },
        ].map(({ val, lbl }) => (
          <div key={lbl} className="bio-stat-block">
            <div className="bio-stat-val">{val}</div>
            <div className="bio-stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* global search */}
      <div className="bio-search-wrap">
        <span className="bio-search-icon">⌕</span>
        <input
          ref={searchRef}
          className="bio-search-input"
          type="text"
          placeholder="Búsqueda global — filtra todas las columnas a la vez…"
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
        />
        {globalSearch && (
          <button className="bio-clear-search" onClick={() => setGlobalSearch("")}>✕</button>
        )}
        {activeFilterCount > 0 && (
          <span className="bio-search-count">
            {filteredData.length} / {rawData.length} cepas
          </span>
        )}
        {activeFilterCount > 0 && (
          <button className="bio-clear-all-btn" onClick={clearAllFilters}>
            ✕ Limpiar todo
          </button>
        )}
      </div>

      {/* toast */}
      {notification && (
        <div className={`bio-toast ${notification.type === "success" ? "bio-toast-success" : "bio-toast-error"}`}>
          {notification.text}
        </div>
      )}

      {/* table */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="bio-table-wrap">
        <table className={`bio-table${isAdmin ? " bio-table--admin" : ""}`}>
            <thead>
              {/* header row */}
              <tr>
                {/* columna pinned (cepa) — no arrastreable */}
                {pinnedCol && (() => {
                  const col = pinnedCol
                  const isSelected = isColSelectedForChart(col.field)
                  const isSorted   = sortConfig.field === col.field
                  const hasFilter  = hasColFilter(col.field)
                  const color      = dc(colColorIndex(col.field))
                  const classes    = [
                    "frozen",
                    isSelected ? "col-selected" : "",
                    isSorted   ? "sorted"       : "",
                    hasFilter && !isSelected ? "has-filter" : "",
                  ].filter(Boolean).join(" ")
                  return (
                    <th key={col.field} style={{ width: col.width ?? 120, minWidth: col.width ?? 100 }} className={classes} onClick={() => handleSort(col.field)}>
                      <div className="bio-th-inner">
                        <div className={`bio-col-checkbox${isSelected ? " bio-col-checkbox--active" : ""}`} style={{ "--col-color": color } as React.CSSProperties} onClick={e => { e.stopPropagation(); onColumnToggle({ field: col.field, name: col.headerName }, !isSelected) }} title={isSelected ? "Quitar del gráfico" : "Añadir al gráfico"}>
                          {isSelected && <span className="bio-col-checkbox-check">✓</span>}
                        </div>
                        <span className="bio-th-text">{col.headerName}</span>
                        <span className="bio-sort-arrow">{isSorted ? (sortConfig.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
                        {hasFilter && <span className="bio-filter-dot">●</span>}
                      </div>
                    </th>
                  )
                })()}

                {/* columnas arrastreables */}
                <SortableContext items={restCols.map(c => c.field)} strategy={horizontalListSortingStrategy}>
                  {restCols.map((col) => (
                    <SortableTh
                      key={col.field}
                      col={col}
                      isSelected={isColSelectedForChart(col.field)}
                      isSorted={sortConfig.field === col.field}
                      sortDir={sortConfig.dir}
                      hasFilter={hasColFilter(col.field)}
                      color={dc(colColorIndex(col.field))}
                      onSort={() => handleSort(col.field)}
                      onColumnToggle={() => onColumnToggle({ field: col.field, name: col.headerName }, !isColSelectedForChart(col.field))}
                    />
                  ))}
                </SortableContext>
              </tr>

              {/* filter row */}
              <tr>
                {orderedCols.map((col, i) => {
                  const isSelected = isColSelectedForChart(col.field)
                  const hasFilter  = hasColFilter(col.field)
                  const tdClass = [
                    "bio-filter-td",
                    col.pinned ? "frozen" : "",
                    isSelected ? "col-selected" : "",
                  ].filter(Boolean).join(" ")

                  if (i === 0 && col.pinned) {
                    return (
                      <td key={col.field} className={tdClass} style={{ width: col.width ?? 120 }}>
                        <div className="bio-filter-empty">—</div>
                      </td>
                    )
                  }

                  return (
                    <td key={col.field} className={tdClass} style={{ width: col.width ?? 120 }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                          className={`bio-col-filter-input${hasFilter ? " active" : ""}`}
                          placeholder={col.type === "date" ? "dd-mm-aa" : "…"}
                          title={
                            col.type === "date"
                              ? "Filtrar fecha: dd-mm-aa  |  >dd-mm-aa  |  <dd-mm-aa  |  desde..hasta"
                              : `Filtrar: ${col.headerName}`
                          }
                          value={columnFilters[col.field] ?? ""}
                          onChange={(e) => setColumnFilter(col.field, e.target.value)}
                        />
                        {hasFilter && (
                          <button
                            className="bio-filter-clear-btn"
                            onClick={() => clearColumnFilter(col.field)}
                            title="Limpiar"
                          >✕</button>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            </thead>

            <tbody>
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={orderedCols.length} className="bio-no-results-cell">
                    Sin resultados para los filtros aplicados
                  </td>
                </tr>
              )}
              {displayData.map((row) => (
                <tr key={row.id}>
                  {orderedCols.map((col) => {
                    const isSelected = isColSelectedForChart(col.field)
                    const rawValue   = col.type === "date" && row[col.field as keyof Cepa]
                      ? (() => {
                          const d = new Date(row[col.field as keyof Cepa] as string)
                          const dd = String(d.getDate()).padStart(2, "0")
                          const mm = String(d.getMonth() + 1).padStart(2, "0")
                          const aa = String(d.getFullYear()).slice(-2)
                          return `${dd}-${mm}-${aa}`
                        })()
                      : row[col.field as keyof Cepa]
                    const strValue   = String(rawValue ?? "")
                    const isEditing  =
                      editingCell?.id === String(row.id) &&
                      editingCell.field === col.field

                    const tdClass = [
                      col.pinned ? "frozen" : "",
                      isSelected ? "col-selected" : "",
                    ].filter(Boolean).join(" ")

                    return (
                      <td
                        key={col.field}
                        className={tdClass}
                        onDoubleClick={() => {
                          if (isAdmin)
                            startEdit(String(row.id), col.field, strValue)
                        }}
                        title={isAdmin ? "Doble click para editar" : undefined}
                      >
                        {isEditing ? (
                          <input
                            className="bio-cell-edit-input"
                            autoFocus
                            value={editingCell!.value}
                            onChange={(e) => handleEditChange(e.target.value)}
                            onKeyDown={onEditKeyDown}
                            onBlur={commitEdit}
                          />
                        ) : (
                          <CellValue value={rawValue} queries={queries} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
      </div>
      </DndContext>

      {/* pagination */}
      <div className="bio-pagination">
        <span className="bio-page-info">
          Página {page} de {totalPages} · {filteredData.length} filas
        </span>
        <div className="bio-page-controls">
          <select
            className="bio-page-select"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
          >
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n} / pág.</option>
            ))}
          </select>
          <button className="bio-page-btn" disabled={page <= 1}          onClick={() => setPage(1)}>«</button>
          <button className="bio-page-btn" disabled={page <= 1}          onClick={() => setPage(page - 1)}>‹</button>
          <span className="bio-page-num">{page} / {totalPages}</span>
          <button className="bio-page-btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
          <button className="bio-page-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  )
}
