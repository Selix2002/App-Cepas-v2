// src/features/cepas/components/ImportCepas.tsx
// Lógica 100% idéntica al original.
// Estilos: className de import-modal.css. Solo quedan inline los colores dinámicos
// de runtime (color de im-stat-val según conteos).

import { useState } from "react"
import Papa from "papaparse"
import ExcelJS from "exceljs"
import { createCepa, addAttribute } from "../services/CepasQuery"
import type { CepaCreate } from "../../../shared/interfaces"
import "./import-modal.css"
import { loader } from "../../../shared/utils/loader"

// ─── types ────────────────────────────────────────────────────────────────────
type ImportRow = {
  name: string
  status: "pending" | "ok" | "duplicate" | "error"
  error?: string
}

type Props = {
  existingNames: string[]
  onImported?: () => void
}

// ─── maps & helpers ───────────────────────────────────────────────────────────
const normalize = (s: string) => s.normalize("NFC").trim().toLowerCase()

const HEADER_MAP: Record<string, keyof CepaCreate> = {
  "Cepa": "cepa",
  "Código Lab": "codigo_lab",
  "Origen": "origen",
  "Latitud": "latitud",
  "Longitud": "longitud",
  "Pigmentación": "pigmentacion",
  "Envío a Punta Arenas": "envio_punta_arenas",
  "Temperatura -80°": "temperatura_80",
  "Medio": "medio",
  "Gram": "gram",
  "Morfología 1": "morfologia_1",
  "Morfología 2": "morfologia_2",
  "Lecitinasa": "lecitinasa",
  "Ureasa": "ureasa",
  "Lipasa": "lipasa",
  "Amilasa": "amilasa",
  "Proteasa": "proteasa",
  "Catalasa": "catalasa",
  "Celulasa": "celulasa",
  "Fosfatasa": "fosfatasa",
  "AIA": "aia",
  "+ 5°C": "temp_5c",
  "+ 25°C": "temp_25c",
  "+ 37°C": "temp_37c",
  "AMP": "amp",
  "CTX": "ctx",
  "CXM": "cxm",
  "CAZ": "caz",
  "AK": "ak",
  "C": "c",
  "TE": "te",
  "AM E.COLI": "am_ecoli",
  "AM SAUREUS": "am_saureus",
  "Gen. 16s": "gen_16s",
  "Metabolómica": "metabolomica",
  "Nicolas": "nicolas",
  "Nombre del Proyecto": "nombre_proyecto",
}

const FLOAT_FIELDS = new Set<keyof CepaCreate>(["latitud", "longitud"])
const IGNORED_HEADERS = new Set(["ID"])
const KNOWN_HEADERS = new Set(Object.keys(HEADER_MAP))

function isNullValue(raw: string): boolean {
  const v = raw.trim().toLowerCase()
  return v === "" || v === "n/i" || v === "n/a"
}

function parseKnownFields(raw: Record<string, string>): CepaCreate {
  const result: Record<string, string | number | null> = {}
  for (const [header, field] of Object.entries(HEADER_MAP)) {
    const rawValue = raw[header]?.trim() ?? ""
    if (isNullValue(rawValue)) {
      result[field] = null
    } else if (FLOAT_FIELDS.has(field)) {
      const n = parseFloat(rawValue.replace(",", "."))
      result[field] = Number.isFinite(n) ? n : null
    } else {
      result[field] = rawValue
    }
  }
  return result as CepaCreate
}

function detectExtraHeaders(rawRows: Record<string, string>[]): string[] {
  const extras = new Set<string>()
  for (const raw of rawRows)
    for (const header of Object.keys(raw))
      if (!KNOWN_HEADERS.has(header) && !IGNORED_HEADERS.has(header))
        extras.add(header)
  return Array.from(extras)
}

function parseCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => resolve(res.data),
      error: (err) => reject(new Error(err.message)),
    })
  })
}

async function parseExcel(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error("No se encontró ninguna hoja en el Excel")

  const headerRow = sheet.getRow(1)
  const headers: string[] = (headerRow.values as (string | undefined)[])
    .slice(1)
    .map((h) => String(h ?? "").trim())

  const rows: Record<string, string>[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj: Record<string, string> = {}
      ; (row.values as (ExcelJS.CellValue | undefined)[]).slice(1).forEach((cell, i) => {
        const header = headers[i]
        if (header) obj[header] = cell != null ? String(cell) : ""
      })
    rows.push(obj)
  })
  return rows
}

async function getRawRows(file: File): Promise<Record<string, string>[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return ["xlsx", "xls"].includes(ext) ? parseExcel(file) : parseCSV(file)
}

// ─── pill className helper ────────────────────────────────────────────────────
const pillClass: Record<ImportRow["status"], string> = {
  ok: "im-pill im-pill-ok",
  duplicate: "im-pill im-pill-duplicate",
  error: "im-pill im-pill-error",
  pending: "im-pill im-pill-pending",
}

const pillLabel: Record<ImportRow["status"], string> = {
  ok: "OK",
  duplicate: "DUPLICADA",
  error: "ERROR",
  pending: "PENDIENTE",
}

// ─── component ────────────────────────────────────────────────────────────────
export default function ImportCepas({ existingNames, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [done, setDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const duplicates = rows.filter((r) => r.status === "duplicate")
  const hasDuplicates = duplicates.length > 0
  const okCount = rows.filter((r) => r.status === "ok").length
  const errCount = rows.filter((r) => r.status === "error").length
  const dupCount = duplicates.length

  const reset = () => { setRows([]); setConfirmed(false); setDone(false); setError(null) }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    reset()
  }

  const handlePrecheck = async () => {
    if (!file) return
    setLoading(true)
    loader(true)
    reset()
    try {
      const rawRows = await getRawRows(file)
      if (rawRows.length === 0) { setError("No se encontraron filas en el archivo."); return }
      const existingSet = new Set(existingNames.map(normalize))
      setRows(rawRows.map((raw) => {
        const name = raw["Cepa"]?.trim() ?? ""
        return { name, status: existingSet.has(normalize(name)) ? "duplicate" : "pending" }
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el archivo")
    } finally {
      setLoading(false)
      loader(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    loader(true)
    setError(null)
    try {
      const rawRows = await getRawRows(file)
      const results: ImportRow[] = []

      for (const raw of rawRows) {
        const name = raw["Cepa"]?.trim() ?? ""
        try {
          await createCepa(parseKnownFields(raw))
          results.push({ name, status: "ok" })
        } catch (e) {
          const axiosErr = e as { response?: { status?: number; data?: { detail?: string } } }
          if (axiosErr?.response?.status === 409) {
            results.push({ name, status: "duplicate" })
          } else {
            const detail = axiosErr?.response?.data?.detail ?? (e instanceof Error ? e.message : "Error desconocido")
            results.push({ name, status: "error", error: detail })
          }
        }
      }

      const extraHeaders = detectExtraHeaders(rawRows)
      for (const header of extraHeaders) {
        const values: Record<string, string | null> = {}
        for (const raw of rawRows) {
          const name = raw["Cepa"]?.trim() ?? ""
          if (!name) continue
          const v = raw[header]?.trim() ?? ""
          values[name] = isNullValue(v) ? null : v
        }
        try { await addAttribute(header, values) }
        catch (e) { console.error(`Error añadiendo atributo "${header}":`, e) }
      }

      setRows(results)
      setDone(true)
      onImported?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar")
    } finally {
      setLoading(false)
      loader(false)
    }
  }

  return (
    <div>

      {/* ── file picker ──────────────────────────────────────────────────── */}
      <label className="im-label">Archivo</label>
      <div
        className={`im-dropzone${dragOver ? " drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f) { setFile(f); reset() }
        }}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="im-file-input"
        />
        {file && <div className="im-filename">▷ {file.name}</div>}
        {!file && <div className="im-drag-hint">También puedes arrastrar un archivo aquí</div>}
      </div>

      {/* ── error ────────────────────────────────────────────────────────── */}
      {error && <div className="im-error">{error}</div>}

      {/* ── precheck button ───────────────────────────────────────────────── */}
      {rows.length === 0 && !done && (
        <button
          className="im-btn im-btn-primary"
          onClick={handlePrecheck}
          disabled={!file || loading}
        >
          {loading ? "Revisando…" : "Comprobar archivo"}
        </button>
      )}

      {/* ── precheck results ──────────────────────────────────────────────── */}
      {rows.length > 0 && !done && (
        <div>
          {/* stats */}
          <div className="im-stats">
            {[
              { val: rows.length, lbl: "Total", color: "#8ab0a0" },
              { val: dupCount, lbl: "Duplicadas", color: dupCount > 0 ? "#ffb347" : "#3a6a5a" },
              { val: rows.length - dupCount, lbl: "Nuevas", color: "#00e5b4" },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} className="im-stat-block">
                <div className="im-stat-val" style={{ color }}>{val}</div>
                <div className="im-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          {/* duplicates */}
          {hasDuplicates && (
            <div className="im-dup-panel">
              <div className="im-dup-title">Cepas duplicadas ({dupCount})</div>
              <div className="im-dup-list">
                {duplicates.map((r, i) => (
                  <div key={i} className="im-dup-item">
                    <span className="im-dup-icon">◈</span>{r.name}
                  </div>
                ))}
              </div>
              <label className="im-dup-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Entiendo que las cepas duplicadas serán omitidas
              </label>
            </div>
          )}

          {/* actions */}
          <div className="im-btn-row">
            <button
              className="im-btn im-btn-primary"
              onClick={handleImport}
              disabled={loading || (hasDuplicates && !confirmed)}
            >
              {loading ? "Importando…" : "Importar"}
            </button>
            <button
              className="im-btn im-btn-ghost"
              onClick={() => { setFile(null); reset() }}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── import results ────────────────────────────────────────────────── */}
      {done && (
        <div>
          {/* stats */}
          <div className="im-stats">
            {[
              { val: okCount, lbl: "Importadas", color: "#00e5b4" },
              { val: dupCount, lbl: "Omitidas", color: "#ffb347" },
              { val: errCount, lbl: "Errores", color: errCount > 0 ? "#ff4d6d" : "#3a6a5a" },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} className="im-stat-block">
                <div className="im-stat-val" style={{ color }}>{val}</div>
                <div className="im-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          {/* row list */}
          <div className="im-results-list">
            {rows.map((r, i) => (
              <div key={i} className="im-result-row">
                <span className="im-result-name">{r.name}</span>
                <div className="im-result-meta">
                  <span className={pillClass[r.status]}>{pillLabel[r.status]}</span>
                  {r.error && <span className="im-row-error">{r.error}</span>}
                </div>
              </div>
            ))}
          </div>

          <button
            className="im-btn im-btn-ghost"
            onClick={() => { setFile(null); reset() }}
          >
            Nueva importación
          </button>
        </div>
      )}
    </div>
  )
}
