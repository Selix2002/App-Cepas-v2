// src/features/feedback/components/FeedbackRatingChart.tsx
import { useEffect, useState } from "react"
import "./feedback-rating-chart.css"

interface Props {
    distribucion: Record<string, number>
    total: number
}

const RATING_COLORS: Record<number, string> = {
    5: "var(--accent)",
    4: "var(--accent-dim)",
    3: "var(--warning)",
    2: "#ff8c42",
    1: "var(--error)",
}

const RATING_LABELS: Record<number, string> = {
    5: "Excelente",
    4: "Buena",
    3: "Regular",
    2: "Mala",
    1: "Muy mala",
}

export default function FeedbackRatingChart({ distribucion, total }: Props) {
    const [animated, setAnimated] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setAnimated(true), 80)
        return () => clearTimeout(t)
    }, [distribucion])

    const max = Math.max(...Object.values(distribucion), 1)

    return (
        <div className="frc-wrap">
            <div className="frc-header">
                <span className="frc-title">Distribución de calificaciones</span>
                <span className="frc-total">{total} evaluaciones</span>
            </div>

            <div className="frc-bars">
                {[5, 4, 3, 2, 1].map((rating) => {
                    const count = distribucion[String(rating)] ?? 0
                    const pct   = total > 0 ? Math.round((count / total) * 100) : 0
                    const fill  = max > 0 ? (count / max) * 100 : 0
                    const color = RATING_COLORS[rating]

                    return (
                        <div key={rating} className="frc-row">
                            <div className="frc-label">
                                <span className="frc-star" style={{ color }}>★</span>
                                <span className="frc-num">{rating}</span>
                                <span className="frc-sub">{RATING_LABELS[rating]}</span>
                            </div>

                            <div className="frc-track">
                                <div
                                    className="frc-fill"
                                    style={{
                                        width: animated ? `${fill}%` : "0%",
                                        background: color,
                                        transitionDelay: `${(5 - rating) * 60}ms`,
                                    }}
                                />
                            </div>

                            <div className="frc-meta">
                                <span className="frc-count">{count}</span>
                                <span className="frc-pct">{pct}%</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
