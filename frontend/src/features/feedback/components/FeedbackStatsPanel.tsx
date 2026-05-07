// src/features/feedback/components/FeedbackStatsPanel.tsx
import type { FeedbackStats } from "../services/feedbackQuery"
import "./feedback-stats-panel.css"

interface Props {
    stats: FeedbackStats | null
    isLoading: boolean
}

function StarDisplay({ value }: { value: number }) {
    const full  = Math.round(value)
    return (
        <span className="fsp-stars">
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= full ? "fsp-star-on" : "fsp-star-off"}>★</span>
            ))}
            <span className="fsp-star-num">{value.toFixed(1)}</span>
        </span>
    )
}

export default function FeedbackStatsPanel({ stats, isLoading }: Props) {
    const cards = [
        {
            key: "total",
            label: "Feedbacks totales",
            value: isLoading ? "—" : String(stats?.total ?? 0),
            sub: "registros",
        },
        {
            key: "avg",
            label: "Calificación promedio",
            value: isLoading ? null : (stats?.promedio_calificacion ?? 0),
            isRating: true,
        },
        {
            key: "comment",
            label: "Con comentario",
            value: isLoading ? "—" : String(stats?.total_con_comentario ?? 0),
            sub: stats && stats.total > 0
                ? `${Math.round((stats.total_con_comentario / stats.total) * 100)}% del total`
                : "—",
        },
    ]

    return (
        <div className="fsp-row">
            {cards.map((card) => (
                <div key={card.key} className={`fsp-card${isLoading ? " fsp-card-loading" : ""}`}>
                    <div className="fsp-card-label">{card.label}</div>
                    {card.isRating ? (
                        <div className="fsp-card-value">
                            {isLoading ? "—" : <StarDisplay value={card.value as number} />}
                        </div>
                    ) : (
                        <div className="fsp-card-value">{card.value}</div>
                    )}
                    {card.sub && <div className="fsp-card-sub">{card.sub}</div>}
                </div>
            ))}
        </div>
    )
}
