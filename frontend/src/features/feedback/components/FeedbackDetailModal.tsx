// src/features/feedback/components/FeedbackDetailModal.tsx
import { useEffect } from "react"
import { X } from "lucide-react"
import type { FeedbackListItem } from "../services/feedbackQuery"
import "./feedback-detail-modal.css"

interface Props {
    item: FeedbackListItem | null
    onClose: () => void
}

const RATING_LABELS: Record<number, string> = {
    1: "Muy mala",
    2: "Mala",
    3: "Regular",
    4: "Buena",
    5: "Excelente",
}

const RATING_COLORS: Record<number, string> = {
    5: "var(--accent)",
    4: "var(--accent-dim)",
    3: "var(--warning)",
    2: "#ff8c42",
    1: "var(--error)",
}

function formatFecha(iso: string): string {
    try {
        const d = new Date(iso)
        return d.toLocaleString("es-CL", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    } catch {
        return iso
    }
}

export default function FeedbackDetailModal({ item, onClose }: Props) {
    useEffect(() => {
        if (!item) return
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        document.addEventListener("keydown", handler)
        return () => document.removeEventListener("keydown", handler)
    }, [item, onClose])

    if (!item) return null

    const color = RATING_COLORS[item.calificacion]

    return (
        <>
            <div className="fdm-overlay" onClick={onClose} />

            <div className="fdm-panel" role="dialog" aria-modal="true">
                {/* header */}
                <div className="fdm-header" style={{ borderTopColor: color }}>
                    <div className="fdm-header-left">
                        <div className="fdm-stars">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <span
                                    key={n}
                                    className="fdm-star"
                                    style={{ color: n <= item.calificacion ? color : "var(--border)" }}
                                >★</span>
                            ))}
                        </div>
                        <div>
                            <div className="fdm-rating-label" style={{ color }}>
                                {RATING_LABELS[item.calificacion]}
                            </div>
                            <div className="fdm-fecha">{formatFecha(item.fecha)}</div>
                        </div>
                    </div>
                    <button className="fdm-close" onClick={onClose} aria-label="Cerrar">
                        <X size={15} />
                    </button>
                </div>

                {/* body */}
                <div className="fdm-body">
                    {/* pregunta */}
                    <section className="fdm-section">
                        <div className="fdm-section-label">Pregunta del usuario</div>
                        <div className="fdm-pregunta">{item.pregunta}</div>
                    </section>

                    {/* respuesta */}
                    <section className="fdm-section">
                        <div className="fdm-section-label">Respuesta de la IA</div>
                        <div className="fdm-respuesta">{item.respuesta}</div>
                    </section>

                    {/* comentario */}
                    {item.comentario && (
                        <section className="fdm-section">
                            <div className="fdm-section-label">Comentario</div>
                            <div className="fdm-comentario">{item.comentario}</div>
                        </section>
                    )}

                    {/* mql query */}
                    {item.mql_query && (
                        <section className="fdm-section">
                            <div className="fdm-section-label">Consulta MQL generada</div>
                            <pre className="fdm-mql">
                                {JSON.stringify(item.mql_query, null, 2)}
                            </pre>
                        </section>
                    )}
                </div>

                {/* footer meta */}
                <div className="fdm-footer">
                    <div className="fdm-meta-pill">
                        <span className="fdm-meta-key">Modelo</span>
                        <span className="fdm-meta-val">{item.modelo_usado}</span>
                    </div>
                    {item.modo_busqueda && (
                        <div className="fdm-meta-pill">
                            <span className="fdm-meta-key">Modo</span>
                            <span className="fdm-meta-val">{item.modo_busqueda}</span>
                        </div>
                    )}
                    <div className="fdm-meta-pill fdm-meta-id">
                        <span className="fdm-meta-key">ID</span>
                        <span className="fdm-meta-val fdm-id">{item.id}</span>
                    </div>
                </div>
            </div>
        </>
    )
}
