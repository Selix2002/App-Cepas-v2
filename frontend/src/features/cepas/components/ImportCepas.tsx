// src/features/cepas/components/ImportCepas.tsx
// El parsing del archivo ocurre en el backend (POST /cepas/import).
// El frontend solo hace precheck de nombres (para UX) y luego sube el archivo.

import { useState } from "react"
import Papa from "papaparse"
import ExcelJS from "exceljs"
import { importCepas } from "../services/CepasQuery"
import type { ImportRowResult } from "../services/CepasQuery"
import "./import-modal.css"
import { loader } from "../../../shared/utils/loader"

// ─── types ────────────────────────────────────────────────────────────────────
type PrecheckRow = {
  name: string
  isDuplicate: boolean
}

type Props = {
  existingNames: string[]
  onImported?: () => void
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const normalize = (s: string) => s.normalize("NFC").trim().toLowerCase()

function parseCsvNames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        // El campo "cepa" puede estar en cualquier capitalización
        const names = res.data
          .map((row) => {
            const key = Object.keys(row).find((k) => k.trim().toLowerCase() === "cepa")
            return key ? row[key]?.trim() ?? "" : ""
          })
          .filter(Boolean)
        resolve(names)
      },
      error: (err) => reject(new Error(err.message)),
    })
  })
}

async function parseExcelNames(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error("No se encontró ninguna hoja en el Excel")

  const headerRow = sheet.getRow(1)
  const headers = (headerRow.values as (string | undefined)[])
    .slice(1)
    .map((h) => String(h ?? "").trim())

  const cepaIdx = headers.findIndex((h) => h.toLowerCase() === "cepa")
  if (cepaIdx === -1) throw new Error('No se encontró la columna "cepa" en el archivo')

  const names: string[] = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    if (row.hidden) return
    const cell = (row.values as (ExcelJS.CellValue | undefined)[])[cepaIdx + 1]
    const name = cell != null ? String(cell).trim() : ""
    if (name) names.push(name)
  })
  return names
}

async function extractCepaNames(file: File): Promise<string[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return ["xlsx", "xls"].includes(ext) ? parseExcelNames(file) : parseCsvNames(file)
}

// ─── pill helpers ─────────────────────────────────────────────────────────────
const statusLabel: Record<ImportRowResult["status"], string> = {
  created: "OK",
  duplicate: "OMITIDA",
  error: "ERROR",
}
const pillClass: Record<ImportRowResult["status"], string> = {
  created: "im-pill im-pill-ok",
  duplicate: "im-pill im-pill-duplicate",
  error: "im-pill im-pill-error",
}

// ─── component ────────────────────────────────────────────────────────────────
export default function ImportCepas({ existingNames, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [precheckRows, setPrecheckRows] = useState<PrecheckRow[]>([])
  const [resultRows, setResultRows] = useState<ImportRowResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [done, setDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const duplicates = precheckRows.filter((r) => r.isDuplicate)
  const hasDuplicates = duplicates.length > 0

  const reset = () => {
    setPrecheckRows([])
    setResultRows([])
    setConfirmed(false)
    setDone(false)
    setError(null)
  }

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
      const names = await extractCepaNames(file)
      if (names.length === 0) { setError("No se encontraron cepas en el archivo."); return }

      const seen = new Set<string>()
      const intraDups = new Set<string>()
      for (const name of names) {
        const norm = normalize(name)
        if (seen.has(norm)) intraDups.add(name)
        else seen.add(norm)
      }
      if (intraDups.size > 0) {
        setError(`El archivo contiene cepas repetidas: ${[...intraDups].join(", ")}`)
        return
      }

      const existingSet = new Set(existingNames.map(normalize))
      setPrecheckRows(names.map((name) => ({ name, isDuplicate: existingSet.has(normalize(name)) })))
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
      const result = await importCepas(file)
      setResultRows(result.rows)
      setDone(true)
      onImported?.()
    } catch (e) {
      const axiosErr = e as { response?: { data?: { detail?: string } } }
      setError(axiosErr?.response?.data?.detail ?? (e instanceof Error ? e.message : "Error al importar"))
    } finally {
      setLoading(false)
      loader(false)
    }
  }

  const okCount = resultRows.filter((r) => r.status === "created").length
  const dupCount = resultRows.filter((r) => r.status === "duplicate").length
  const errCount = resultRows.filter((r) => r.status === "error").length

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

      {/* ── limits note ──────────────────────────────────────────────────── */}
      <div className="im-limits">
        <span>· Max 10 MB</span>
        <span>· Max 5.000 filas con cepa</span>
        <span>· Las filas ocultas son omitidas (solo Excel)</span>
      </div>

      {/* ── error ────────────────────────────────────────────────────────── */}
      {error && <div className="im-error">{error}</div>}

      {/* ── precheck button ───────────────────────────────────────────────── */}
      {precheckRows.length === 0 && !done && (
        <button
          className="im-btn im-btn-primary"
          onClick={handlePrecheck}
          disabled={!file || loading}
        >
          {loading ? "Revisando…" : "Comprobar archivo"}
        </button>
      )}

      {/* ── precheck results ──────────────────────────────────────────────── */}
      {precheckRows.length > 0 && !done && (
        <div>
          <div className="im-stats">
            {[
              { val: precheckRows.length, lbl: "Total", color: "#8ab0a0" },
              { val: duplicates.length,   lbl: "Duplicadas", color: duplicates.length > 0 ? "#ffb347" : "#3a6a5a" },
              { val: precheckRows.length - duplicates.length, lbl: "Nuevas", color: "#00e5b4" },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} className="im-stat-block">
                <div className="im-stat-val" style={{ color }}>{val}</div>
                <div className="im-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          {hasDuplicates && (
            <div className="im-dup-panel">
              <div className="im-dup-title">Cepas duplicadas ({duplicates.length})</div>
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
          <div className="im-stats">
            {[
              { val: okCount,  lbl: "Importadas", color: "#00e5b4" },
              { val: dupCount, lbl: "Omitidas",   color: "#ffb347" },
              { val: errCount, lbl: "Errores",     color: errCount > 0 ? "#ff4d6d" : "#3a6a5a" },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} className="im-stat-block">
                <div className="im-stat-val" style={{ color }}>{val}</div>
                <div className="im-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>

          <div className="im-results-list">
            {resultRows.map((r, i) => (
              <div key={i} className="im-result-row">
                <span className="im-result-name">{r.cepa}</span>
                <div className="im-result-meta">
                  <span className={pillClass[r.status]}>{statusLabel[r.status]}</span>
                  {r.error && <span className="im-row-error">{r.error}</span>}
                </div>
              </div>
            ))}
          </div>

          <button className="im-btn im-btn-ghost" onClick={() => { setFile(null); reset() }}>
            Nueva importación
          </button>
        </div>
      )}
    </div>
  )
}
