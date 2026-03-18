// src/features/cepas/components/new-attribute/NewAttributeHeader.tsx
import { Link } from "react-router-dom"
import "./new-attribute.css"

export default function NewAttributeHeader() {
    return (
        <header className="na-topbar">
            <Link to="/home" className="na-btn-back">
                ← Volver
            </Link>
            <span className="na-topbar-title">Nuevo Atributo</span>
            <div style={{ width: 100 }} />
        </header>
    )
}
