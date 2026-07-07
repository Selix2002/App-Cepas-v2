// src/features/cepas/components/home/components/header/HomeHeader.tsx
import { useRef, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Moon, Sun } from "lucide-react"
import type { CepaColumnDef } from "../../../../types/tableTypes"
import { useTheme } from "../../../../../../app/ThemeContext"
import { IA_ENABLED } from "../../../../../../shared/config/features"
import "./header.css"

type HomeHeaderProps = {
    isAdmin: boolean
    columns: CepaColumnDef[]
    hiddenFields: Set<string>
    selectedColumnName?: string
    chatOpen: boolean
    onToggleChat: () => void
    onLogout: () => void
    onOpenImport: () => void
    onExport: () => void
    onToggleColumnVisibility: (colId: string, visible: boolean) => void
}

// ── ripple helper ─────────────────────────────────────────────────────────────
function addRipple(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const span = document.createElement("span")
    span.className = "ripple"
    span.style.top = `${e.clientY - rect.top}px`
    span.style.left = `${e.clientX - rect.left}px`
    btn.appendChild(span)
    span.addEventListener("animationend", () => span.remove())
}

export default function HomeHeader({
    isAdmin,
    selectedColumnName,
    chatOpen,
    onToggleChat,
    onLogout,
    onOpenImport,
    onExport,
}: HomeHeaderProps) {
    const { theme, toggle } = useTheme()
    const [createMenuOpen, setCreateMenuOpen] = useState(false)
    const createMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!createMenuOpen) return
        function handler(e: MouseEvent) {
            if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node))
                setCreateMenuOpen(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [createMenuOpen])

    return (
        <div className="hdr-root">

            {/* ── LEFT: logo ──────────────────────────────────────────────────── */}
            <div className="hdr-logo">
                <span className="hdr-logo-icon">⬡</span>
                <div>
                    <div className="hdr-logo-name">CEPADB</div>
                    <div className="hdr-logo-sub">Patagonia · Cepas</div>
                </div>
            </div>

            {/* ── THEME TOGGLE ─────────────────────────────────────────────────── */}
            <button
                className={`hdr-theme-toggle ${theme}`}
                onClick={toggle}
                aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
                <span className="hdr-theme-pill-track">
                    <span className="hdr-theme-pill-thumb">
                        {theme === "dark" ? <Moon size={11} /> : <Sun size={11} />}
                    </span>
                </span>
            </button>

            {/* ── CENTER: título + estado ──────────────────────────────────────── */}
            <div className="hdr-center">
                <div className="hdr-title">
                    Dashboard para Gestión de Cepas Bacterianas
                </div>
                <div className="hdr-status-row">
                    <span className={`hdr-status-dot ${selectedColumnName ? "active" : "idle"}`} />
                    <span className="hdr-status-text">
                        {selectedColumnName
                            ? `Analizando: ${selectedColumnName}`
                            : "Selecciona una columna para analizar"}
                    </span>
                </div>
            </div>

            {/* ── RIGHT: botones ──────────────────────────────────────────────── */}
            <div className="hdr-actions">

                {/* cerrar sesión */}
                <button
                    className="hdr-btn hdr-btn-danger"
                    onClick={(e) => { addRipple(e); onLogout() }}
                >
                    Cerrar sesión
                </button>

                {/* importar */}
                {isAdmin && (
                    <button
                        className="hdr-btn hdr-btn-ghost"
                        onClick={(e) => { addRipple(e); onOpenImport() }}
                    >
                        Importar
                    </button>
                )}

                {/* exportar */}
                {isAdmin && (
                    <button
                        className="hdr-btn hdr-btn-ghost"
                        onClick={(e) => { addRipple(e); onExport() }}
                    >
                        Exportar
                    </button>
                )}


                {/* chat IA — oculto cuando IA_ENABLED=false (CPU sin soporte para el stack de IA) */}
                {IA_ENABLED && (
                <button
                    className={`hdr-btn hdr-btn-chat${chatOpen ? " active" : ""}`}
                    onClick={(e) => { addRipple(e); onToggleChat() }}
                    title={chatOpen ? "Cerrar chat IA" : "Abrir chat IA"}
                >
                    IA Chat
                </button>
                )}

                {/* crear nuevo — solo admin */}
                {isAdmin && (
                    <div className="hdr-dropdown-wrap" ref={createMenuRef}>
                        <button
                            className="hdr-btn hdr-btn-teal"
                            onClick={(e) => { addRipple(e); setCreateMenuOpen((v) => !v) }}
                        >
                            + Crear nuevo
                        </button>

                        {createMenuOpen && (
                            <div className="hdr-dropdown">
                                {[
                                    { to: "/home/addcepa", label: "🧫 Nueva Cepa" },
                                    { to: "/home/addatribute", label: "🧬 Nuevo Atributo" },
                                    { to: "/home/UserManagement", label: "👤 Nuevo Usuario" },
                                    ...(IA_ENABLED ? [{ to: "/home/FeedbackIA", label: "📊 Feedback IA" }] : []),
                                ].map(({ to, label }) => (
                                    <Link
                                        key={to}
                                        to={to}
                                        className="hdr-dropdown-item"
                                        onClick={() => setCreateMenuOpen(false)}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
