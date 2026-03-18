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

const SECTIONS: SectionDef[] = [
  { id: "identificacion", title: "Identificación", color: "#00e5b4", cols: 3, fields: ["cepa", "codigo_lab", "origen"] },
  { id: "ubicacion", title: "Ubicación", color: "#4d9fff", cols: 2, fields: ["latitud", "longitud"] },
  { id: "caracteristicas", title: "Características", color: "#ff8c42", cols: 3, fields: ["pigmentacion", "gram", "medio", "morfologia_1", "morfologia_2", "temperatura_80"] },
  { id: "almacenamiento", title: "Almacenamiento", color: "#00c4a0", cols: 1, fields: ["envio_punta_arenas"] },
  { id: "enzimatica", title: "Actividad enzimática", color: "#a78bfa", cols: 3, fields: ["lecitinasa", "ureasa", "lipasa", "amilasa", "proteasa", "catalasa", "celulasa", "fosfatasa", "aia"] },
  { id: "temperatura", title: "Temperatura de crecimiento", color: "#ffb347", cols: 3, fields: ["temp_5c", "temp_25c", "temp_37c"] },
  { id: "antibiotica", title: "Resistencia antibiótica", color: "#ff4d6d", cols: 3, fields: ["amp", "ctx", "cxm", "caz", "ak", "c", "te", "am_ecoli", "am_saureus"] },
  { id: "genetica", title: "Genética y proyectos", color: "#c084fc", cols: 2, fields: ["gen_16s", "metabolomica", "nicolas", "nombre_proyecto"] },
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
  const isRequired = col.field === "cepa"

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
  columns, formData, inputRefs, onFieldChange, onKeyDown, onAddCepa,
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

  const canSubmit = !!(formData["cepa"]?.trim())

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()} style={{ display: "contents" }}>
        <div className="nc-content">

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
          Enter para avanzar campo &nbsp;·&nbsp; * requerido
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
