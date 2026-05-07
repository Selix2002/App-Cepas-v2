// src/features/feedback/components/FeedbackHeader.tsx
import { Link } from "react-router-dom"
import { useTheme } from "../../../app/ThemeContext"
import { Moon, Sun, RefreshCw } from "lucide-react"
import "./feedback-header.css"

interface Props {
    onRefresh: () => void
    isRefreshing: boolean
}

export default function FeedbackHeader({ onRefresh, isRefreshing }: Props) {
    const { theme, toggle } = useTheme()

    return (
        <div className="fbh-root">
            <div className="fbh-left">
                <Link to="/home" className="fbh-back-link">← Volver</Link>
            </div>

            <div className="fbh-center">
                <span className="fbh-logo-icon">⬡</span>
                <div>
                    <div className="fbh-title">Feedback IA</div>
                    <div className="fbh-subtitle">Revisión de evaluaciones del chat</div>
                </div>
            </div>

            <div className="fbh-right">
                <button
                    className="fbh-refresh-btn"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    title="Actualizar datos"
                >
                    <RefreshCw size={13} className={isRefreshing ? "fbh-spin" : ""} />
                    <span>Actualizar</span>
                </button>

                <button
                    className={`fbh-theme-toggle ${theme}`}
                    onClick={toggle}
                    aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                    <span className="fbh-theme-pill-track">
                        <span className="fbh-theme-pill-thumb">
                            {theme === "dark" ? <Moon size={11} /> : <Sun size={11} />}
                        </span>
                    </span>
                </button>
            </div>
        </div>
    )
}
