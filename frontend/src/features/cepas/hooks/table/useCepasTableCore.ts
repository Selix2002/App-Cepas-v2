// src/features/cepas/hooks/table/useCepasTableCore.ts
// Reemplaza: useCepasGrid + useCepasTableData + useCepasCellEditing
// Sin ninguna dependencia de ag-grid.

import { useState, useEffect, useMemo, useCallback } from "react"
import { getCepas, getFieldLabels, updateCepa } from "../../services/CepasQuery"
import { getCepasColumnDefsWithExtras } from "../../components/CepasColumns"
import type { Cepa, CepaUpdate, User } from "../../../../shared/interfaces"
import type {
    CepaColumnDef,
    SortConfig,
    NotificationState,
    CoordFilter,
} from "../../types/tableTypes"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { loader } from "../../../../shared/utils/loader"

// ─── localStorage helpers ────────────────────────────────────────────────────
const hiddenKey = (userId: string) => `bio_hidden_cols_${userId}`
const orderKey  = (userId: string) => `bio_col_order_${userId}`

function loadHidden(userId: string): string[] {
    try {
        const raw = localStorage.getItem(hiddenKey(userId))
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function saveHidden(userId: string, fields: string[]) {
    localStorage.setItem(hiddenKey(userId), JSON.stringify(fields))
}

function loadColumnOrder(userId: string): string[] {
    try {
        const raw = localStorage.getItem(orderKey(userId))
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function saveColumnOrder(userId: string, order: string[]) {
    localStorage.setItem(orderKey(userId), JSON.stringify(order))
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const next = [...arr]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    return next
}

// ─── types ───────────────────────────────────────────────────────────────────
type EditingCell = { id: string; field: string; value: string }

type Params = {
    user: User | null
    onDataLoaded?: (data: Cepa[]) => void
}

// ─── date filter helper ───────────────────────────────────────────────────────
// Formatos aceptados: dd-mm-aa  o  dd-mm-aaaa
// Expresiones: ">fecha"  "<fecha"  "fecha..fecha"
function parseDateInput(s: string): Date | null {
    const m = s.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/)
    if (!m) return null
    const [, d, mo, y] = m
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
    return new Date(year, parseInt(mo) - 1, parseInt(d))
}

function applyDateFilter(rawIso: string | null, expr: string): boolean {
    if (!rawIso) return false
    const cellDate = new Date(rawIso)
    cellDate.setHours(0, 0, 0, 0)

    const trimmed = expr.trim()

    // Rango: "01-05-24..30-07-24"
    if (trimmed.includes("..")) {
        const [fromStr, toStr] = trimmed.split("..")
        const from = parseDateInput(fromStr)
        const to   = parseDateInput(toStr)
        if (from) from.setHours(0, 0, 0, 0)
        if (to)   to.setHours(23, 59, 59, 999)
        if (from && to) return cellDate >= from && cellDate <= to
        if (from)       return cellDate >= from
        if (to)         return cellDate <= to
        return false
    }

    // Mayor que: ">15-05-24"
    if (trimmed.startsWith(">")) {
        const d = parseDateInput(trimmed.slice(1))
        if (!d) return false
        d.setHours(0, 0, 0, 0)
        return cellDate > d
    }

    // Menor que: "<15-05-24"
    if (trimmed.startsWith("<")) {
        const d = parseDateInput(trimmed.slice(1))
        if (!d) return false
        d.setHours(23, 59, 59, 999)
        return cellDate < d
    }

    // Coincidencia exacta de día: "15-05-24"
    const d = parseDateInput(trimmed)
    if (d) {
        return (
            cellDate.getDate()     === d.getDate() &&
            cellDate.getMonth()    === d.getMonth() &&
            cellDate.getFullYear() === d.getFullYear()
        )
    }

    return false
}

// ─── hook ────────────────────────────────────────────────────────────────────
export function useCepasTableCore({ user, onDataLoaded }: Params) {
    // raw data
    const [rawData, setRawData] = useState<Cepa[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [refreshToken, setRefreshToken] = useState(0)

    // columns
    const [columnDefs, setColumnDefs] = useState<CepaColumnDef[]>([])
    const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set())
    const [columnOrder, setColumnOrder] = useState<string[]>([])

    // filters
    const [globalSearch, setGlobalSearch] = useState("")
    const [columnFilters, setColumnFiltersState] = useState<Record<string, string>>({})
    const [coordFilter, setCoordFilter] = useState<CoordFilter | null>(null)

    // sort
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "cepa", dir: "asc" })

    // pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)

    // editing
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
    const [notification, setNotification] = useState<NotificationState>(null)

    // ── fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true)
        loader(true)
        Promise.all([getCepas(), getFieldLabels().catch(() => ({}))])
            .then(([{ items }, labels]) => {
                setRawData(items)
                onDataLoaded?.(items)
                const defs = getCepasColumnDefsWithExtras(items as unknown as Record<string, unknown>[], labels)
                setColumnDefs(defs)

                if (user?.id) {
                    setHiddenFields(new Set(loadHidden(user.id)))

                    const nonPinned = defs.filter(c => !c.pinned).map(c => c.field)
                    const saved = loadColumnOrder(user.id).filter(f => nonPinned.includes(f))
                    const unsaved = nonPinned.filter(f => !saved.includes(f))
                    setColumnOrder([...saved, ...unsaved])
                } else {
                    setColumnOrder(defs.filter(c => !c.pinned).map(c => c.field))
                }
            })
            .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
            .finally(() => {
                setLoading(false)
                loader(false)
            })
    }, [refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── derived: columns in user-defined order ────────────────────────────────
    const orderedColumnDefs = useMemo(() => {
        const defMap = new Map(columnDefs.map(c => [c.field, c]))
        const pinned = columnDefs.filter(c => c.pinned)
        const ordered = columnOrder.map(f => defMap.get(f)).filter((c): c is CepaColumnDef => !!c)
        return [...pinned, ...ordered]
    }, [columnDefs, columnOrder])

    // ── derived: visible columns (ordered + filtered) ──────────────────────────
    const visibleColumnDefs = useMemo(
        () => orderedColumnDefs.filter((c) => !hiddenFields.has(c.field)),
        [orderedColumnDefs, hiddenFields]
    )

    // ── derived: filtered + sorted rows ───────────────────────────────────────
    const filteredData = useMemo(() => {
        let rows = rawData

        // global search
        if (globalSearch.trim()) {
            const q = globalSearch.toLowerCase()
            rows = rows.filter((row) =>
                Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
            )
        }

        // per-column filters
        for (const [field, val] of Object.entries(columnFilters)) {
            if (!val) continue
            const colDef = columnDefs.find((c) => c.field === field)
            if (colDef?.type === "date") {
                rows = rows.filter((row) => {
                    const raw = (row as unknown as Record<string, unknown>)[field]
                    return applyDateFilter(raw as string | null, val)
                })
            } else {
                const q = val.toLowerCase()
                rows = rows.filter((row) =>
                    String((row as unknown as Record<string, unknown>)[field] ?? "").toLowerCase().includes(q)
                )
            }
        }

        // coordinate filter (from map)
        if (coordFilter) {
            rows = rows.filter(
                (row) =>
                    Number(row.latitud?.toFixed?.(6)) === coordFilter.lat &&
                    Number(row.longitud?.toFixed?.(6)) === coordFilter.lng
            )
        }

        // sort
        const { field, dir } = sortConfig
        const mul = dir === "asc" ? 1 : -1
        rows = [...rows].sort((a, b) => {
            const av = String((a as unknown as Record<string, unknown>)[field] ?? "")
            const bv = String((b as unknown as Record<string, unknown>)[field] ?? "")
            const na = parseFloat(av)
            const nb = parseFloat(bv)
            if (!isNaN(na) && !isNaN(nb)) return (na - nb) * mul
            return av.localeCompare(bv) * mul
        })

        return rows
    }, [rawData, globalSearch, columnFilters, coordFilter, sortConfig, columnDefs])

    // ── derived: paginated ─────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))

    const displayData = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredData.slice(start, start + pageSize)
    }, [filteredData, page, pageSize])

    // reset page on filter change
    useEffect(() => { setPage(1) }, [globalSearch, columnFilters, coordFilter])

    // ── filter helpers ─────────────────────────────────────────────────────────
    const setColumnFilter = useCallback((field: string, val: string) => {
        setColumnFiltersState((prev) => ({ ...prev, [field]: val }))
    }, [])

    const clearColumnFilter = useCallback((field: string) => {
        setColumnFiltersState((prev) => {
            const next = { ...prev }
            delete next[field]
            return next
        })
    }, [])

    const clearAllFilters = useCallback(() => {
        setGlobalSearch("")
        setColumnFiltersState({})
        setCoordFilter(null)
    }, [])

    const activeFilterCount =
        Object.values(columnFilters).filter(Boolean).length +
        (globalSearch ? 1 : 0) +
        (coordFilter ? 1 : 0)

    // ── sort ──────────────────────────────────────────────────────────────────
    const handleSort = useCallback((field: string) => {
        setSortConfig((prev) =>
            prev.field === field
                ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { field, dir: "asc" }
        )
    }, [])

    // ── column reorder ────────────────────────────────────────────────────────
    const reorderColumns = useCallback((activeId: string, overId: string) => {
        setColumnOrder(prev => {
            const from = prev.indexOf(activeId)
            const to   = prev.indexOf(overId)
            if (from === -1 || to === -1) return prev
            const next = arrayMove(prev, from, to)
            if (user?.id) saveColumnOrder(user.id, next)
            return next
        })
    }, [user])

    // ── column visibility ─────────────────────────────────────────────────────
    const toggleColumnVisibility = useCallback(
        (field: string, visible: boolean) => {
            setHiddenFields((prev) => {
                const next = new Set(prev)
                if (visible) next.delete(field)
                else next.add(field)
                if (user?.id) saveHidden(user.id, Array.from(next))
                return next
            })
        },
        [user]
    )

    // ── inline editing ────────────────────────────────────────────────────────
    const showNotification = (text: string, type: "success" | "error") => {
        setNotification({ text, type })
        setTimeout(() => setNotification(null), 3000)
    }

    const startEdit = useCallback((id: string, field: string, currentValue: string) => {
        setEditingCell({ id, field, value: currentValue })
    }, [])

    const handleEditChange = useCallback((value: string) => {
        setEditingCell((prev) => (prev ? { ...prev, value } : null))
    }, [])

    const cancelEdit = useCallback(() => setEditingCell(null), [])

    const commitEdit = useCallback(async () => {
        if (!editingCell) return
        const { id, field, value } = editingCell
        const row = rawData.find((r) => String(r.id) === id)
        if (!row) return

        const oldValue = String((row as unknown as Record<string, unknown>)[field] ?? "")
        if (oldValue === value.trim()) {
            setEditingCell(null)
            return
        }

        try {
            const payload: CepaUpdate = { [field]: value.trim() === "" ? null : value.trim() }
            const updated = await updateCepa(id, payload)
            setRawData((prev) =>
                prev.map((r) => (String(r.id) === id ? { ...r, ...updated } : r))
            )
            showNotification("Cambios guardados", "success")
        } catch {
            showNotification("Error al guardar los cambios", "error")
        } finally {
            setEditingCell(null)
        }
    }, [editingCell, rawData])

    // ── export ────────────────────────────────────────────────────────────────
    const handleExport = useCallback(async () => {
        const wb = new ExcelJS.Workbook()
        const ws = wb.addWorksheet("Cepas")
        const cols = visibleColumnDefs

        const headerRow = ws.addRow(cols.map((c) => c.headerName))
        headerRow.eachCell((cell) => {
            cell.font = { bold: true }
            cell.border = {
                top: { style: "thin" }, left: { style: "thin" },
                bottom: { style: "thin" }, right: { style: "thin" },
            }
        })

        filteredData.forEach((row) => {
            const dataRow = ws.addRow(
                cols.map((c) => {
                    const v = (row as unknown as Record<string, unknown>)[c.field]
                    if (v === null || v === undefined) return ""
                    if (typeof v === "object") return JSON.stringify(v)
                    return v
                })
            )
            dataRow.eachCell((cell) => {
                cell.border = {
                    top: { style: "thin" }, left: { style: "thin" },
                    bottom: { style: "thin" }, right: { style: "thin" },
                }
            })
        })

        cols.forEach((_, i) => {
            const col = ws.getColumn(i + 1)
            let max = 10
            col.eachCell({ includeEmpty: true }, (cell) => {
                const len = cell.value ? String(cell.value).length : 0
                max = Math.max(max, len)
            })
            col.width = max + 2
        })

        const buffer = await wb.xlsx.writeBuffer()
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), "cepas.xlsx")
    }, [filteredData, visibleColumnDefs])

    return {
        // data
        rawData,
        filteredData,
        displayData,
        loading,
        error,

        // columns
        columnDefs,
        orderedColumnDefs,
        visibleColumnDefs,
        hiddenFields,
        toggleColumnVisibility,
        reorderColumns,

        // search & filter
        globalSearch,
        setGlobalSearch,
        columnFilters,
        setColumnFilter,
        clearColumnFilter,
        clearAllFilters,
        activeFilterCount,

        // coord filter (for map)
        coordFilter,
        setCoordFilter,

        // sort
        sortConfig,
        handleSort,

        // pagination
        page,
        pageSize,
        totalPages,
        setPage,
        setPageSize,

        // editing
        editingCell,
        startEdit,
        handleEditChange,
        commitEdit,
        cancelEdit,
        notification,

        // refresh
        refreshToken,
        setRefreshToken,

        // export
        handleExport,
    }
}
