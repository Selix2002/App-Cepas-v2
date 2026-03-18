// src/shared/components/ModalConfirmation.tsx
import { useEffect } from "react"
import "./modal-confirmation.css"

interface Props {
  visible: boolean
  data: Record<string, string>
  onConfirm: () => void
  onCancel: () => void
  labels?: Record<string, string>   // field → etiqueta legible
}

export default function ModalConfirmation({ visible, data, onConfirm, onCancel, labels }: Props) {
  // ESC para cerrar
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [visible, onCancel])

  if (!visible) return null

  // Detectar si es cepa o atributo
  const name   = data["cepa"] || data["attribute_name"] || "—"
  const isCepa = Boolean(data["cepa"])
  const accion = isCepa ? "la nueva cepa" : "el atributo"
  const icon   = isCepa ? "🧫" : "⚗️"

  // Todas las entradas — excluye la clave de nombre para no duplicarla en la tabla
  const entries = Object.entries(data)

  return (
    <div className="mc-overlay">
      <div className="mc-backdrop" onClick={onCancel} />

      <div className="mc-card">
        <div className="mc-accent" />

        {/* header */}
        <div className="mc-header">
          <span className="mc-hex">⬡</span>
          <span className="mc-title">Confirmar</span>
          <span className="mc-subtitle">— vista previa</span>
          <button className="mc-close" onClick={onCancel} aria-label="Cerrar">✕</button>
        </div>

        {/* body */}
        <div className="mc-body">

          {/* badge de entidad */}
          <div className="mc-badge">
            <span className="mc-badge-icon">{icon}</span>
            <div>
              <div className="mc-badge-label">{isCepa ? "Nueva cepa" : "Nuevo atributo"}</div>
              <div className="mc-badge-name">{name}</div>
            </div>
          </div>

          {/* tabla completa con scroll */}
          <div className="mc-table-wrap">
            <table className="mc-table">
              <thead>
                <tr>
                  <th>Campo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([key, val]) => {
                  const isEmpty = val === "" || val === null || val === undefined
                  const label = labels?.[key] ?? key
                  return (
                    <tr key={key}>
                      <td className="mc-td-key">{label}</td>
                      <td className={isEmpty ? "mc-td-empty" : "mc-td-val"}>
                        {isEmpty ? "— vacío" : String(val)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* footer */}
        <div className="mc-footer">
          <p className="mc-confirm-text">
            ¿Confirmas añadir {accion} <strong>"{name}"</strong> a la base de datos?
          </p>
          <div className="mc-btn-row">
            <button className="mc-btn mc-btn-cancel" onClick={onCancel}>
              Cancelar
            </button>
            <button className="mc-btn mc-btn-confirm" onClick={onConfirm}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
