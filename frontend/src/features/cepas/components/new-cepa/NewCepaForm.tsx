// src/features/cepas/components/new-cepa/NewCepaForm.tsx
// Actualizado: lee nc_section_assignments de localStorage para incluir
// atributos dinámicos en la sección correspondiente.
import type React from "react"
import type { CepaColumnDef } from "../../types/tableTypes"
import { SECTION_STORAGE_KEY } from "../new-attribute/SectionSelect"
import "./new-cepa.css"

// ── definición de secciones (mismos IDs que en SectionSelect) ──────────────
type SectionDef = {
  id: string
  title: string
  color: string
  cols: 1 | 2 | 3 | 4
  fields: string[]
}

// Solo campos fijos del modelo. Los atributos dinámicos se asignan a secciones
// desde "Nuevo Atributo" y se añaden automáticamente a la sección correspondiente.
const SECTIONS: SectionDef[] = [
  { id: "identificacion", title: "Identificación", color: "#00e5b4", cols: 1, fields: ["cepa"] },
  { id: "ubicacion",      title: "Ubicación",      color: "#4d9fff", cols: 2, fields: ["latitud", "longitud"] },
  { id: "almacenamiento", title: "Almacenamiento", color: "#00c4a0", cols: 1, fields: ["envio_punta_arenas"] },
]

// Fields fijos asignados a alguna sección estática
const STATIC_ASSIGNED = new Set(SECTIONS.flatMap((s) => s.fields))

// Lee las asignaciones dinámicas guardadas desde "Nuevo Atributo"
function loadDynamicAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SECTION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// ── props ───────────────────────────────────────────────────────────────────
type Props = {
  columns: CepaColumnDef[]
  formData: Record<string, string>
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
  onFieldChange: (field: string, value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void
  onAddCepa: () => void
  isDuplicate?: boolean
}

// ── field component ──────────────────────────────────────────────────────────
function Field({
  col, index, formData, inputRefs, onFieldChange, onKeyDown,
}: {
  col: CepaColumnDef
  index: number
  formData: Record<string, string>
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
  onFieldChange: (field: string, value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void
}) {
  const isNumeric = col.type === "number"
  const REQUIRED_FIELDS = new Set(["cepa", "latitud", "longitud"])
  const isRequired = REQUIRED_FIELDS.has(col.field)

  return (
    <div className="nc-field">
      <label
        htmlFor={col.field}
        className={`nc-field-label${isRequired ? " required" : ""}`}
      >
        {col.headerName}
      </label>
      <input
        id={col.field}
        name={col.field}
        type={isNumeric ? "number" : "text"}
        inputMode={isNumeric ? "decimal" : undefined}
        step={isNumeric ? "any" : undefined}
        className="nc-input"
        placeholder={isNumeric ? "valor numérico" : "valor o N/I"}
        value={formData[col.field] ?? ""}
        ref={(el) => { inputRefs.current[index] = el }}
        onChange={(e) => onFieldChange(col.field, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, index)}
      />
    </div>
  )
}

// ── section component ────────────────────────────────────────────────────────
function Section({
  title, color, cols, children, count,
}: {
  title: string
  color: string
  cols: 1 | 2 | 3 | 4
  children: React.ReactNode
  count: number
}) {
  return (
    <div className="nc-section">
      <div className="nc-section-header">
        <div className="nc-section-dot" style={{ background: color }} />
        <span className="nc-section-title">{title}</span>
        <span className="nc-section-count">{count} {count === 1 ? "campo" : "campos"}</span>
      </div>
      <div className={`nc-fields-grid nc-grid-${cols}`}>
        {children}
      </div>
    </div>
  )
}

// ── main component ───────────────────────────────────────────────────────────
export default function NewCepaForm({
  columns, formData, inputRefs, onFieldChange, onKeyDown, onAddCepa, isDuplicate,
}: Props) {
  const colByField = new Map(columns.map((c) => [c.field, c]))

  // Asignaciones dinámicas guardadas desde "Nuevo Atributo"
  const dynamicAssignments = loadDynamicAssignments()

  // Campos extra (no fijos), agrupados por su sección asignada (o "otros")
  const extraCols = columns.filter(
    (c) => c.field !== "id" && !STATIC_ASSIGNED.has(c.field)
  )

  // Map: sectionId → CepaColumnDef[] de campos dinámicos
  const dynamicBySectionId = new Map<string, CepaColumnDef[]>()
  const unassignedExtras: CepaColumnDef[] = []

  extraCols.forEach((col) => {
    const sectionId = dynamicAssignments[col.field] ?? dynamicAssignments[col.headerName]
    if (sectionId) {
      if (!dynamicBySectionId.has(sectionId)) dynamicBySectionId.set(sectionId, [])
      dynamicBySectionId.get(sectionId)!.push(col)
    } else {
      unassignedExtras.push(col)
    }
  })

  let globalIdx = 0

  const renderField = (col: CepaColumnDef) => {
    const idx = globalIdx++
    return (
      <Field
        key={col.field}
        col={col}
        index={idx}
        formData={formData}
        inputRefs={inputRefs}
        onFieldChange={onFieldChange}
        onKeyDown={onKeyDown}
      />
    )
  }

  const REQUIRED_FIELDS = ["cepa", "latitud", "longitud"]

  const latVal = parseFloat(formData["latitud"] ?? "")
  const lonVal = parseFloat(formData["longitud"] ?? "")
  const latFilled = !!(formData["latitud"]?.trim())
  const lonFilled = !!(formData["longitud"]?.trim())
  const invalidLat = latFilled && (isNaN(latVal) || latVal < -90  || latVal > 90)
  const invalidLon = lonFilled && (isNaN(lonVal) || lonVal < -180 || lonVal > 180)

  const canSubmit = REQUIRED_FIELDS.every((f) => !!(formData[f]?.trim()))
    && !isDuplicate && !invalidLat && !invalidLon

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: "contents" }}>
        <div className="nc-content">

          {/* ── alertas ── */}
          {isDuplicate && (
            <div className="nc-alert-duplicate">
              <div className="nc-alert-icon">⚠</div>
              <div className="nc-alert-body">
                <span className="nc-alert-title">Cepa duplicada</span>
                <span className="nc-alert-msg">
                  Ya existe una cepa con el nombre{" "}
                  <strong>"{formData["cepa"]}"</strong> en la base de datos.
                  Elige un nombre distinto para continuar.
                </span>
              </div>
            </div>
          )}
          {invalidLat && (
            <div className="nc-alert-duplicate">
              <div className="nc-alert-icon">⚠</div>
              <div className="nc-alert-body">
                <span className="nc-alert-title">Latitud inválida</span>
                <span className="nc-alert-msg">
                  La latitud debe estar entre <strong>−90°</strong> y <strong>+90°</strong>.
                  Valor ingresado: <strong>{formData["latitud"]}</strong>.
                </span>
              </div>
            </div>
          )}
          {invalidLon && (
            <div className="nc-alert-duplicate">
              <div className="nc-alert-icon">⚠</div>
              <div className="nc-alert-body">
                <span className="nc-alert-title">Longitud inválida</span>
                <span className="nc-alert-msg">
                  La longitud debe estar entre <strong>−180°</strong> y <strong>+180°</strong>.
                  Valor ingresado: <strong>{formData["longitud"]}</strong>.
                </span>
              </div>
            </div>
          )}

          {/* ── secciones estáticas + campos dinámicos asignados a ellas ── */}
          {SECTIONS.map((section) => {
            const staticCols = section.fields
              .map((f) => colByField.get(f))
              .filter((c): c is CepaColumnDef => !!c)

            const dynamicCols = dynamicBySectionId.get(section.id) ?? []
            const allCols = [...staticCols, ...dynamicCols]

            if (allCols.length === 0) return null

            return (
              <Section
                key={section.id}
                title={section.title}
                color={section.color}
                cols={section.cols}
                count={allCols.length}
              >
                {allCols.map(renderField)}
              </Section>
            )
          })}

          {/* ── "Otros atributos" — campos sin sección asignada ── */}
          {unassignedExtras.length > 0 && (
            <Section
              title="Otros atributos"
              color="#78909c"
              cols={3}
              count={unassignedExtras.length}
            >
              {unassignedExtras.map(renderField)}
            </Section>
          )}

        </div>
      </form>

      {/* footer sticky */}
      <div className="nc-footer">
        <span className="nc-footer-hint">
          Enter para avanzar campo &nbsp;·&nbsp; * Cepa, Latitud y Longitud son requeridos
        </span>
        <button
          className="nc-btn-submit"
          onClick={onAddCepa}
          disabled={!canSubmit}
          type="button"
        >
          + Añadir Cepa
        </button>
      </div>
    </>
  )
}
