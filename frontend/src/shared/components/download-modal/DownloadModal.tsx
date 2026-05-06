// src/shared/components/DownloadModal.tsx
// Lógica 100% idéntica al original.
// Estilos: className de download-modal.css.
// Mejora UX: selector de formato como pills en lugar de <select>.

import React, { useEffect, useState } from "react"
import "./download-modal.css"

type ImgFormat = "png" | "jpeg" | "tiff"

export interface DownloadOptions {
  width: number
  height: number
  format: ImgFormat
  quality: number   // 0..1
  fileName: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (opts: DownloadOptions) => void
  defaults?: Partial<DownloadOptions> & { aspectRatio?: number | "lock" }
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

const FORMAT_OPTIONS: { value: ImgFormat; label: string; hint: string }[] = [
  { value: "jpeg", label: "JPEG", hint: "comprimido" },
  { value: "png",  label: "PNG",  hint: "sin pérdida" },
  { value: "tiff", label: "TIFF", hint: "impresión" },
]

const DownloadModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, defaults }) => {
  const initWidth  = Math.round(defaults?.width  ?? 1200)
  const initHeight = Math.round(defaults?.height ?? 675)

  const initialAR =
    defaults?.aspectRatio === "lock"
      ? initWidth / initHeight
      : typeof defaults?.aspectRatio === "number"
      ? defaults.aspectRatio
      : undefined

  const [fileName,    setFileName]    = useState(defaults?.fileName ?? "grafico")
  const [format,      setFormat]      = useState<ImgFormat>(defaults?.format ?? "jpeg")
  const [quality,     setQuality]     = useState<number>(defaults?.quality ?? 1)
  const [widthInput,  setWidthInput]  = useState<string>(String(initWidth))
  const [heightInput, setHeightInput] = useState<string>(String(initHeight))
  const [lockAspect,  setLockAspect]  = useState<boolean>(!!initialAR)
  const [lockedAR,    setLockedAR]    = useState<number>(initialAR ?? initWidth / initHeight)

  // Reset al abrir
  useEffect(() => {
    if (!isOpen) return
    setFileName(defaults?.fileName ?? "grafico")
    setFormat(defaults?.format ?? "jpeg")
    setQuality(defaults?.quality ?? 1)
    setWidthInput(String(initWidth))
    setHeightInput(String(initHeight))
    const ar = initialAR ?? initWidth / initHeight
    setLockedAR(ar)
    setLockAspect(!!initialAR)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ESC para cerrar
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  const handleWidthChange = (v: string) => {
    setWidthInput(v)
    if (!lockAspect || v === "" || isNaN(Number(v))) return
    const w = clamp(Number(v), 1, 10000)
    setHeightInput(String(Math.max(1, Math.round(w / lockedAR))))
  }

  const handleHeightChange = (v: string) => {
    setHeightInput(v)
    if (!lockAspect || v === "" || isNaN(Number(v))) return
    const h = clamp(Number(v), 1, 10000)
    setWidthInput(String(Math.max(1, Math.round(h * lockedAR))))
  }

  const toggleLock = (checked: boolean) => {
    setLockAspect(checked)
    if (checked) {
      const w = Number(widthInput)
      const h = Number(heightInput)
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0)
        setLockedAR(w / h)
      else
        setLockedAR(initialAR ?? initWidth / initHeight)
    }
  }

  const isLossless = format === "png" || format === "tiff"
  const widthNum   = Number(widthInput)
  const heightNum  = Number(heightInput)
  const widthValid  = widthInput  !== "" && Number.isFinite(widthNum)  && widthNum  > 0
  const heightValid = heightInput !== "" && Number.isFinite(heightNum) && heightNum > 0
  const canConfirm  = widthValid && heightValid

  const submit = () => {
    const w = clamp(parseInt(widthInput  || "0", 10), 100, 10000)
    const h = clamp(parseInt(heightInput || "0", 10), 100, 10000)
    onConfirm({
      width: w, height: h, format,
      quality: isLossless ? 1 : clamp(quality, 0.05, 1),
      fileName: fileName.trim() || "grafico",
    })
  }

  if (!isOpen) return null

  return (
    <div className="dm-overlay" role="dialog" aria-modal="true" aria-label="Configuración de descarga">
      <div className="dm-backdrop" onClick={onClose} />

      <div className="dm-card">
        <div className="dm-accent-line" />

        {/* ── header ────────────────────────────────────────────────────── */}
        <div className="dm-header">
          <div className="dm-header-left">
            <span className="dm-hex">⬡</span>
            <span className="dm-title">Descargar Gráfico</span>
            <span className="dm-subtitle">— exportar imagen</span>
          </div>
          <button className="dm-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* ── body ──────────────────────────────────────────────────────── */}
        <div className="dm-body">

          {/* nombre + formato */}
          <div className="dm-row-2">
            <div>
              <label className="dm-label">Nombre de archivo</label>
              <input
                className="dm-input"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="grafico"
              />
            </div>

            <div>
              <label className="dm-label">Formato</label>
              <div className="dm-format-pills">
                {FORMAT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`dm-format-pill${format === value ? " active" : ""}`}
                    onClick={() => setFormat(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* resolución */}
          <div>
            <div className="dm-res-header">
              <span className="dm-res-title">Resolución</span>
              <label className="dm-lock-label">
                <input
                  type="checkbox"
                  checked={lockAspect}
                  onChange={(e) => toggleLock(e.target.checked)}
                />
                Bloquear proporción
              </label>
            </div>

            <div className="dm-row-2">
              <div>
                <label className="dm-label">Ancho</label>
                <div className="dm-input-wrap">
                  <input
                    className="dm-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="1200"
                    value={widthInput}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    style={{ paddingRight: 36 }}
                  />
                  <span className="dm-input-suffix">PX</span>
                </div>
              </div>
              <div>
                <label className="dm-label">Alto</label>
                <div className="dm-input-wrap">
                  <input
                    className="dm-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="675"
                    value={heightInput}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    style={{ paddingRight: 36 }}
                  />
                  <span className="dm-input-suffix">PX</span>
                </div>
              </div>
            </div>

            <p className="dm-res-hint">
              Deja el campo vacío para usar las dimensiones actuales del gráfico.
            </p>
          </div>

          {/* calidad */}
          <div>
            <div className="dm-quality-header">
              <span className="dm-quality-title">Calidad</span>
              <span className={`dm-quality-val${isLossless ? " disabled" : ""}`}>
                {isLossless ? "no aplica a PNG / TIFF" : `${Math.round(quality * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              className="dm-slider"
              min={5}
              max={100}
              step={5}
              disabled={isLossless}
              value={Math.round(quality * 100)}
              onChange={(e) => setQuality(Number(e.target.value) / 100)}
              style={{
                background: isLossless
                  ? undefined
                  : `linear-gradient(to right, #00e5b4 ${Math.round(quality * 100)}%, #1a2f28 ${Math.round(quality * 100)}%)`,
              }}
            />
          </div>
        </div>

        {/* ── footer ────────────────────────────────────────────────────── */}
        <div className="dm-footer">
          <div className="dm-summary">
            Salida:&nbsp;
            <strong>{widthValid ? widthNum : "—"} × {heightValid ? heightNum : "—"} px</strong>
            &nbsp;·&nbsp;{format.toUpperCase()}
            {!isLossless && <>&nbsp;·&nbsp;{Math.round(quality * 100)}%</>}
          </div>

          <div className="dm-footer-actions">
            <button className="dm-btn dm-btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="dm-btn dm-btn-primary"
              onClick={submit}
              disabled={!canConfirm}
            >
              ↓ Descargar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DownloadModal
