// src/features/cepas/components/CepasTable/CepasTable.tsx
// Tabla completamente custom con diseño bioluminiscente.
// No usa ag-grid en absoluto.

import { useRef, type KeyboardEvent } from "react"
import "./bioTable.css"
import type { CepaColumnDef, SortConfig, NotificationState } from "../../types/tableTypes"
import type { Cepa } from "../../../../shared/interfaces"
import type { ChartType, ColumnSelection } from "../../hooks/charts/useCepasCharts"

// ─── paleta para los dots del sidebar ────────────────────────────────────────
const DOT_COLORS = [
  "#00e5b4","#4d9fff","#ff8c42","#a78bfa","#ff4d6d",
  "#00c4a0","#3a8aff","#ffb347","#c084fc","#ff6b8a",
  "#00a888","#2878dd","#ff9830","#9060e0","#ff5277",
]
const dotColor = (i: number) => DOT_COLORS[i % DOT_COLORS.length]

// ─── helpers ─────────────────────────────────────────────────────────────────
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

function CellValue({
  value,
  queries,
}: {
  value: unknown
  queries: string[]
}) {
  const raw = String(value ?? "")
  if (raw === "+" )  return <span className="bio-pill bio-pill-pos">+</span>
  if (raw === "–" || raw === "-") return <span className="bio-pill bio-pill-neg">–</span>
  if (raw === "N/I" || raw === "") return <span className="bio-pill bio-pill-ni">N/I</span>
  return <>{highlight(raw, queries)}</>
}

// ─── props ────────────────────────────────────────────────────────────────────
export interface CepasTableProps {
  // columns
  columnDefs: CepaColumnDef[]
  visibleColumnDefs: CepaColumnDef[]
  hiddenFields: Set<string>
  toggleColumnVisibility: (field: string, visible: boolean) => void

  // data
  displayData: Cepa[]
  filteredData: Cepa[]
  rawData: Cepa[]

  // search & filter
  globalSearch: string
  setGlobalSearch: (q: string) => void
  columnFilters: Record<string, string>
  setColumnFilter: (field: string, val: string) => void
  clearColumnFilter: (field: string) => void
  clearAllFilters: () => void
  activeFilterCount: number

  // sort
  sortConfig: SortConfig
  handleSort: (field: string) => void

  // pagination
  page: number
  pageSize: number
  totalPages: number
  setPage: (p: number) => void
  setPageSize: (ps: number) => void

  // editing
  editingCell: { id: string; field: string; value: string } | null
  startEdit: (id: string, field: string, currentValue: string) => void
  handleEditChange: (value: string) => void
  commitEdit: () => Promise<void>
  cancelEdit: () => void
  isAdmin: boolean
  notification: NotificationState

  // charts (sidebar)
  selectedColumns: ColumnSelection[]
  onColumnToggle: (col: ColumnSelection, checked: boolean) => void
  chartType: ChartType
}

// ─── component ───────────────────────────────────────────────────────────────
export default function CepasTable({
  columnDefs,
  visibleColumnDefs,
  hiddenFields,
  toggleColumnVisibility,
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
  chartType: _chartType,
}: CepasTableProps) {
  const searchRef = useRef<HTMLInputElement>(null)

  // ── chart column selection count ───────────────────────────────────────────
  const uniqueValuesForSelected = (field: string): number => {
    const set = new Set(filteredData.map((r) => String((r as unknown as Record<string, unknown>)[field] ?? "N/I")))
    return set.size
  }

  const isColumnSelectedForChart = (field: string) =>
    selectedColumns.some((c) => c.field === field)

  // ── keyboard: commit on Enter, cancel on Escape ────────────────────────────
  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitEdit()
    if (e.key === "Escape") cancelEdit()
  }

  // ── active filter for a column ─────────────────────────────────────────────
  const hasColFilter = (field: string) => !!(columnFilters[field])

  const pinnedCol = visibleColumnDefs.find((c) => c.pinned)
  const restCols   = visibleColumnDefs.filter((c) => !c.pinned)

  // rendered column order: pinned first, then rest
  const orderedCols = pinnedCol ? [pinnedCol, ...restCols] : visibleColumnDefs

  const queries = [globalSearch, ...Object.values(columnFilters)].filter(Boolean)

  return (
    <div className="bio-layout" style={{ height: "100%" }}>
      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
      <div className="bio-sidebar">
        <div className="bio-sidebar-section">Columnas</div>
        <div className="bio-sidebar-scroll">
          {columnDefs.map((col, i) => {
            const isSelected = isColumnSelectedForChart(col.field)
            const isHidden   = hiddenFields.has(col.field)
            return (
              <div
                key={col.field}
                className={`bio-col-item${isSelected ? " active" : ""}${isHidden ? "" : ""}`}
                title={col.headerName}
              >
                {/* dot = chart selector */}
                <div
                  className="bio-col-dot"
                  style={{
                    background: isSelected ? dotColor(i) : "transparent",
                    border: `1.5px solid ${dotColor(i)}`,
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    onColumnToggle({ field: col.field, name: col.headerName }, !isSelected)
                  }
                  title={isSelected ? "Quitar del gráfico" : "Añadir al gráfico"}
                />
                {/* name = visibility toggle */}
                <span
                  className="bio-col-name"
                  style={{ opacity: isHidden ? 0.4 : 1, cursor: "pointer" }}
                  onClick={() => toggleColumnVisibility(col.field, isHidden)}
                  title={isHidden ? "Mostrar columna" : "Ocultar columna"}
                >
                  {col.headerName}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <div className="bio-main">
        {/* stats */}
        <div className="bio-stats-row">
          <div className="bio-stat-block">
            <div className="bio-stat-val">{rawData.length}</div>
            <div className="bio-stat-lbl">Cepas totales</div>
          </div>
          <div className="bio-stat-block">
            <div className="bio-stat-val">{filteredData.length}</div>
            <div className="bio-stat-lbl">Mostrando</div>
          </div>
          <div className="bio-stat-block">
            <div className="bio-stat-val">
              {selectedColumns[0]
                ? uniqueValuesForSelected(selectedColumns[0].field)
                : "—"}
            </div>
            <div className="bio-stat-lbl">Categorías</div>
          </div>
          <div className="bio-stat-block">
            <div className="bio-stat-val">{activeFilterCount}</div>
            <div className="bio-stat-lbl">Filtros activos</div>
          </div>
          <div className="bio-stat-block">
            <div className="bio-stat-val">{visibleColumnDefs.length}</div>
            <div className="bio-stat-lbl">Columnas visibles</div>
          </div>
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
            <button
              className="bio-clear-search"
              onClick={() => setGlobalSearch("")}
            >
              ✕
            </button>
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

        {/* notification toast */}
        {notification && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 999,
              background: notification.type === "success" ? "#00e5b422" : "#ff4d6d22",
              border: `1px solid ${notification.type === "success" ? "#00e5b4" : "#ff4d6d"}`,
              color: notification.type === "success" ? "#00e5b4" : "#ff4d6d",
              padding: "6px 20px",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: "inherit",
              letterSpacing: 1,
            }}
          >
            {notification.text}
          </div>
        )}

        {/* table */}
        <div className="bio-table-wrap">
          {filteredData.length === 0 ? (
            <div className="bio-no-results">
              Sin resultados para los filtros aplicados
            </div>
          ) : (
            <table className="bio-table">
              <thead>
                {/* ── header row ── */}
                <tr>
                  {orderedCols.map((col) => {
                    const isSelected = isColumnSelectedForChart(col.field)
                    const isSorted   = sortConfig.field === col.field
                    const hasFilter  = hasColFilter(col.field)
                    const classes = [
                      col.pinned ? "frozen" : "",
                      isSelected ? "col-selected" : "",
                      isSorted   ? "sorted"       : "",
                      hasFilter && !isSelected ? "has-filter" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")

                    return (
                      <th
                        key={col.field}
                        style={{ width: col.width ?? 120, minWidth: col.width ?? 100 }}
                        className={classes}
                        onClick={() => handleSort(col.field)}
                      >
                        <div className="bio-th-inner">
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                            {col.headerName}
                          </span>
                          <span className="bio-sort-arrow">
                            {isSorted ? (sortConfig.dir === "asc" ? "▲" : "▼") : "⇅"}
                          </span>
                          {hasFilter && <span className="bio-filter-dot">●</span>}
                        </div>
                      </th>
                    )
                  })}
                </tr>

                {/* ── filter row ── */}
                <tr>
                  {orderedCols.map((col, i) => {
                    const isSelected = isColumnSelectedForChart(col.field)
                    const hasFilter  = hasColFilter(col.field)
                    const tdClass = [
                      "bio-filter-td",
                      col.pinned ? "frozen" : "",
                      isSelected ? "col-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")

                    if (i === 0 && col.pinned) {
                      // frozen first col — no filter input, just empty
                      return (
                        <td key={col.field} className={tdClass} style={{ width: col.width ?? 120 }} />
                      )
                    }

                    return (
                      <td key={col.field} className={tdClass} style={{ width: col.width ?? 120 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            className={`bio-col-filter-input${hasFilter ? " active" : ""}`}
                            placeholder="…"
                            title={`Filtrar: ${col.headerName}`}
                            value={columnFilters[col.field] ?? ""}
                            onChange={(e) => setColumnFilter(col.field, e.target.value)}
                          />
                          {hasFilter && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--bio-red)",
                                cursor: "pointer",
                                padding: "0 2px",
                                flexShrink: 0,
                              }}
                              onClick={() => clearColumnFilter(col.field)}
                              title="Limpiar"
                            >
                              ✕
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {displayData.map((row) => (
                  <tr key={row.id}>
                    {orderedCols.map((col) => {
                      const isSelected = isColumnSelectedForChart(col.field)
                      const rawValue   = (row as unknown as Record<string, unknown>)[col.field]
                      const strValue   = String(rawValue ?? "")
                      const isEditing  =
                        editingCell?.id === String(row.id) &&
                        editingCell.field === col.field

                      const tdClass = [
                        col.pinned ? "frozen" : "",
                        isSelected ? "col-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")

                      return (
                        <td
                          key={col.field}
                          className={tdClass}
                          style={
                            col.pinned
                              ? { fontWeight: 700, color: "var(--bio-teal)", cursor: isAdmin ? "pointer" : "default" }
                              : { cursor: isAdmin ? "pointer" : "default" }
                          }
                          onDoubleClick={() => {
                            if (isAdmin && !col.pinned)
                              startEdit(String(row.id), col.field, strValue)
                          }}
                          title={isAdmin && !col.pinned ? "Doble click para editar" : undefined}
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
          )}
        </div>

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
            <button
              className="bio-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >«</button>
            <button
              className="bio-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >‹</button>
            <span style={{ fontSize: 10, color: "var(--bio-text1)", minWidth: 40, textAlign: "center" }}>
              {page} / {totalPages}
            </span>
            <button
              className="bio-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >›</button>
            <button
              className="bio-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >»</button>
          </div>
        </div>
      </div>
    </div>
  )
}
