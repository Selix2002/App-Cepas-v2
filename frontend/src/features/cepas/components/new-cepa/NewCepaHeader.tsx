// src/features/cepas/components/new-cepa/NewCepaHeader.tsx
import { Link } from "react-router-dom"
import "./new-cepa.css"

export default function NewCepaHeader() {
  return (
    <header className="nc-topbar">
      <Link to="/home" className="nc-btn-back">
        ← Volver
      </Link>

      <span className="nc-topbar-title">Nueva Cepa</span>

      {/* espacio para mantener el título centrado */}
      <div style={{ width: 100 }} />
    </header>
  )
}
