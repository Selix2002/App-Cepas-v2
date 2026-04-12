// src/features/cepas/components/home/components/chat/FeedbackWidget.tsx
import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown, X, Send, Check } from "lucide-react"
import { postFeedback } from "../../../../services/fbService"
import "./feedback-widget.css"

type FeedbackWidgetProps = {
    pregunta:      string
    respuesta:     string
    modoBusqueda?: string | null
}

const LABELS: Record<number, string> = {
    1: "Muy mala",
    2: "Mala",
    3: "Regular",
    4: "Buena",
    5: "Excelente",
}

type Status = "idle" | "sending" | "sent" | "error"

export default function FeedbackWidget({ pregunta, respuesta, modoBusqueda }: FeedbackWidgetProps) {
    const [open, setOpen]               = useState(false)
    const [rating, setRating]           = useState<number | null>(null)
    const [hoverRating, setHoverRating] = useState<number | null>(null)
    const [comment, setComment]         = useState("")
    const [voted, setVoted]             = useState<"up" | "down" | null>(null)
    const [status, setStatus]           = useState<Status>("idle")

    const activeRating = hoverRating ?? rating

    const handleThumb = (type: "up" | "down") => {
        if (status === "sent") return
        setVoted(type)
        if (!rating) setRating(type === "up" ? 4 : 2)
        setOpen(true)
    }

    const handleClose = () => {
        if (status === "sending") return
        setOpen(false)
    }

    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [open])

    const handleSend = async () => {
        if (!rating || status === "sending") return
        setStatus("sending")
        try {
            await postFeedback({
                pregunta,
                respuesta,
                calificacion:  rating,
                comentario:    comment.trim() || null,
                modo_busqueda: modoBusqueda ?? null,
            })
            setStatus("sent")
            setTimeout(() => setOpen(false), 900)
        } catch {
            setStatus("error")
        }
    }

    return (
        <>
            {/* ── botones pulgar ────────────────────────────────────────── */}
            <div className="fb-buttons">
                <button
                    className={`fb-thumb fb-up${voted === "up" ? " fb-voted" : ""}${status === "sent" ? " fb-done" : ""}`}
                    onClick={() => handleThumb("up")}
                    title="Buena respuesta"
                    aria-label="Marcar como buena respuesta"
                    disabled={status === "sent"}
                >
                    <ThumbsUp size={12} />
                </button>
                <button
                    className={`fb-thumb fb-down${voted === "down" ? " fb-voted" : ""}${status === "sent" ? " fb-done" : ""}`}
                    onClick={() => handleThumb("down")}
                    title="Mala respuesta"
                    aria-label="Marcar como mala respuesta"
                    disabled={status === "sent"}
                >
                    <ThumbsDown size={12} />
                </button>
            </div>

            {/* ── overlay ──────────────────────────────────────────────── */}
            <div
                className={`fb-overlay${open ? " fb-overlay-open" : ""}`}
                onClick={handleClose}
                aria-hidden="true"
            />

            {/* ── modal ────────────────────────────────────────────────── */}
            <div
                className={`fb-modal${open ? " fb-modal-open" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label="Calificar respuesta"
            >
                {/* header */}
                <div className="fb-modal-header">
                    <span className="fb-modal-title">Calificar respuesta</span>
                    <button
                        className="fb-close-btn"
                        onClick={handleClose}
                        aria-label="Cerrar"
                        disabled={status === "sending"}
                    >
                        <X size={13} />
                    </button>
                </div>

                {/* body */}
                <div className="fb-modal-body">
                    {/* rating bar */}
                    <div className="fb-section-label">Calificación</div>
                    <div className="fb-rating-row">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                className={`fb-seg${activeRating !== null && activeRating >= n ? " fb-seg-fill" : ""}`}
                                onMouseEnter={() => setHoverRating(n)}
                                onMouseLeave={() => setHoverRating(null)}
                                onClick={() => setRating(n)}
                                disabled={status === "sending" || status === "sent"}
                                aria-label={`Calificación ${n} — ${LABELS[n]}`}
                            >
                                {n}
                            </button>
                        ))}
                        {activeRating && (
                            <span className="fb-rating-label">{LABELS[activeRating]}</span>
                        )}
                    </div>

                    {/* comment */}
                    <div className="fb-section-label">
                        Comentario <span className="fb-optional">(opcional)</span>
                    </div>
                    <textarea
                        className="fb-textarea"
                        placeholder="¿Qué estuvo bien o mal en esta respuesta?"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        disabled={status === "sending" || status === "sent"}
                        aria-label="Comentario opcional"
                    />

                    {status === "error" && (
                        <span className="fb-error-msg">Error al enviar. Intenta de nuevo.</span>
                    )}
                </div>

                {/* footer */}
                <div className="fb-modal-footer">
                    <button
                        className={`fb-send-btn${status === "sent" ? " fb-send-success" : ""}`}
                        onClick={handleSend}
                        disabled={rating === null || status === "sending" || status === "sent"}
                        aria-label="Enviar calificación"
                    >
                        {status === "sent" ? (
                            <><Check size={12} /> Enviado</>
                        ) : (
                            <><Send size={12} /> {status === "sending" ? "Enviando…" : "Enviar"}</>
                        )}
                    </button>
                </div>
            </div>
        </>
    )
}
