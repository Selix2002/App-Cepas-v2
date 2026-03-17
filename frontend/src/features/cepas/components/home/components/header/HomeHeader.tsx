// src/features/cepas/components/home/components/header/HomeHeader.tsx
import { useRef, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { CepaColumnDef } from "../../../../types/tableTypes"
import "./header.css"

type HomeHeaderProps = {
    isAdmin: boolean
    columns: CepaColumnDef[]
    hiddenFields: Set<string>
    selectedColumnName?: string
    mapOpen: boolean
    onToggleMap: () => void
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
    mapOpen,
    onToggleMap,
    onLogout,
    onOpenImport,
    onExport,
}: HomeHeaderProps) {
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

    const mono: React.CSSProperties = { fontFamily: "'Courier New', monospace" }

    return (
        <div
            style={{
                ...mono,
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                height: 56,
                background: "#0b1220",
                borderBottom: "2px solid #00e5b422",
                flexShrink: 0,
                position: "relative",
                zIndex: 200,
                gap: 16,
            }}
        >
            {/* ── LEFT: logo ──────────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ color: "#00e5b4", fontSize: 22, lineHeight: 1 }}>⬡</span>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#00e5b4", letterSpacing: 2 }}>
                        CEPADB
                    </div>
                    <div style={{ fontSize: 9, color: "#3a6a5a", letterSpacing: 1, marginTop: 1 }}>
                        Patagonia · Cepas
                    </div>
                </div>
            </div>

            {/* ── CENTER: título + estado ──────────────────────────────────────── */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#00e5b4",
                        letterSpacing: 3,
                        textTransform: "uppercase",
                    }}
                >
                    Dashboard para Gestión de Cepas Bacterianas
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <span className={`hdr-status-dot ${selectedColumnName ? "active" : "idle"}`} />
                    <span style={{ fontSize: 10, color: "#3a6a5a", letterSpacing: 1 }}>
                        {selectedColumnName
                            ? `Analizando: ${selectedColumnName}`
                            : "Selecciona una columna para analizar"}
                    </span>
                </div>
            </div>

            {/* ── RIGHT: botones ──────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

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
                <button
                    className="hdr-btn hdr-btn-ghost"
                    onClick={(e) => { addRipple(e); onExport() }}
                >
                    Exportar
                </button>

                {/* mapa */}
                <button
                    className={`hdr-btn hdr-btn-map${mapOpen ? " active" : ""}`}
                    onClick={(e) => { addRipple(e); onToggleMap() }}
                    title={mapOpen ? "Cerrar mapa" : "Abrir mapa"}
                >
                    🗺 Mapa
                </button>

                {/* crear nuevo — solo admin */}
                {isAdmin && (
                    <div style={{ position: "relative" }} ref={createMenuRef}>
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
