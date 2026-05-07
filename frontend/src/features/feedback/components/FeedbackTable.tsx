// src/features/feedback/components/FeedbackTable.tsx
import type { FeedbackListItem } from "../services/feedbackQuery"
import "./feedback-table.css"

interface Props {
    items: FeedbackListItem[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    onPageChange: (page: number) => void
    onRowClick: (item: FeedbackListItem) => void
    isLoading: boolean
    filterRating: number | null
    onFilterRating: (r: number | null) => void
    sortBy: "fecha" | "calificacion"
    order: "asc" | "desc"
    onSort: (field: "fecha" | "calificacion") => void
}

const MODO_LABELS: Record<string, string> = {
    "estadístico": "estadístico",
    "estadistico": "estadístico",
    "hibrido":     "híbrido",
    "híbrido":     "híbrido",
    "semantico":   "semántico",
    "semántico":   "semántico",
}

function Stars({ value }: { value: number }) {
    return (
        <span className="fbt-stars">
            {[1, 2, 3, 4, 5].map((n) => (
                <span
                    key={n}
                    className={n <= value ? "fbt-star-on" : "fbt-star-off"}
                    data-rating={value}
                >★</span>
            ))}
        </span>
    )
}

function truncate(s: string, max: number) {
    return s.length > max ? s.slice(0, max) + "…" : s
}

function formatFecha(iso: string): string {
    try {
        const d = new Date(iso)
        return d.toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    } catch {
        return iso
    }
}

export default function FeedbackTable({
    items, total, page, pageSize, totalPages,
    onPageChange, onRowClick, isLoading,
    filterRating, onFilterRating,
    sortBy, order, onSort,
}: Props) {
    const sortArrow = (field: string) => {
        if (sortBy !== field) return <span className="fbt-sort-inactive">⇅</span>
        return <span className="fbt-sort-active">{order === "asc" ? "▲" : "▼"}</span>
    }

    return (
        <div className="fbt-wrap">
            {/* toolbar */}
            <div className="fbt-toolbar">
                <div className="fbt-filter-group">
                    <span className="fbt-filter-label">Filtrar por ★</span>
                    {[null, 5, 4, 3, 2, 1].map((r) => (
                        <button
                            key={r ?? "all"}
                            className={`fbt-filter-btn${filterRating === r ? " fbt-filter-active" : ""}`}
                            onClick={() => onFilterRating(r)}
                            data-rating={r ?? "all"}
                        >
                            {r === null ? "Todos" : `★${r}`}
                        </button>
                    ))}
                </div>
                <span className="fbt-count">{total} registros</span>
            </div>

            {/* table */}
            {isLoading ? (
                <div className="fbt-loading">Cargando registros…</div>
            ) : (
                <div className="fbt-table-wrap">
                    <table className="fbt-table">
                        <thead>
                            <tr>
                                <th
                                    className={sortBy === "fecha" ? "sorted" : ""}
                                    onClick={() => onSort("fecha")}
                                    style={{ width: 160 }}
                                >
                                    Fecha {sortArrow("fecha")}
                                </th>
                                <th
                                    className={sortBy === "calificacion" ? "sorted" : ""}
                                    onClick={() => onSort("calificacion")}
                                    style={{ width: 100 }}
                                >
                                    Calif. {sortArrow("calificacion")}
                                </th>
                                <th>Pregunta</th>
                                <th style={{ width: 110 }}>Modo</th>
                                <th style={{ width: 90 }}>Coment.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="fbt-no-results">
                                        Sin resultados para este filtro
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="fbt-row-clickable"
                                        onClick={() => onRowClick(item)}
                                        title="Click para ver detalle completo"
                                    >
                                        <td className="fbt-td-fecha">
                                            {formatFecha(item.fecha)}
                                        </td>
                                        <td>
                                            <Stars value={item.calificacion} />
                                        </td>
                                        <td className="fbt-td-pregunta">
                                            {truncate(item.pregunta, 90)}
                                        </td>
                                        <td>
                                            {item.modo_busqueda ? (
                                                <span className={`fbt-modo fbt-modo-${item.modo_busqueda.replace(/[íé]/g, (c) => c === "í" ? "i" : "e")}`}>
                                                    {MODO_LABELS[item.modo_busqueda] ?? item.modo_busqueda}
                                                </span>
                                            ) : (
                                                <span className="fbt-muted">—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            {item.comentario
                                                ? <span className="fbt-comment-yes" title={item.comentario}>✓</span>
                                                : <span className="fbt-muted">—</span>
                                            }
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* pagination */}
            <div className="fbt-pagination">
                <span className="fbt-page-info">
                    Página {page} de {totalPages} · {total} registros
                </span>
                <div className="fbt-page-controls">
                    <button className="fbt-page-btn" disabled={page <= 1}           onClick={() => onPageChange(1)}>«</button>
                    <button className="fbt-page-btn" disabled={page <= 1}           onClick={() => onPageChange(page - 1)}>‹</button>
                    <span className="fbt-page-num">{page} / {totalPages}</span>
                    <button className="fbt-page-btn" disabled={page >= totalPages}  onClick={() => onPageChange(page + 1)}>›</button>
                    <button className="fbt-page-btn" disabled={page >= totalPages}  onClick={() => onPageChange(totalPages)}>»</button>
                </div>
            </div>
        </div>
    )
}
