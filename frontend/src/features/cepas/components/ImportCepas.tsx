import { useState } from "react"
import Papa from "papaparse"
import ExcelJS from "exceljs"
import { createCepa, addAttribute } from "../services/CepasQuery"
import type { CepaCreate } from "../../../shared/interfaces"

type ImportRow = {
  name: string
  status: "pending" | "ok" | "duplicate" | "error"
  error?: string
}

type Props = {
  existingNames: string[]
  onImported?: () => void
}

const normalize = (s: string) => s.normalize("NFC").trim().toLowerCase()

const HEADER_MAP: Record<string, keyof CepaCreate> = {
  "Cepa":                 "cepa",
  "Código Lab":           "codigo_lab",
  "Origen":               "origen",
  "Latitud":              "latitud",
  "Longitud":             "longitud",
  "Pigmentación":         "pigmentacion",
  "Envío a Punta Arenas": "envio_punta_arenas",
  "Temperatura -80°":     "temperatura_80",
  "Medio":                "medio",
  "Gram":                 "gram",
  "Morfología 1":         "morfologia_1",
  "Morfología 2":         "morfologia_2",
  "Lecitinasa":           "lecitinasa",
  "Ureasa":               "ureasa",
  "Lipasa":               "lipasa",
  "Amilasa":              "amilasa",
  "Proteasa":             "proteasa",
  "Catalasa":             "catalasa",
  "Celulasa":             "celulasa",
  "Fosfatasa":            "fosfatasa",
  "AIA":                  "aia",
  "+ 5°C":                "temp_5c",
  "+ 25°C":               "temp_25c",
  "+ 37°C":               "temp_37c",
  "AMP":                  "amp",
  "CTX":                  "ctx",
  "CXM":                  "cxm",
  "CAZ":                  "caz",
  "AK":                   "ak",
  "C":                    "c",
  "TE":                   "te",
  "AM E.COLI":            "am_ecoli",
  "AM SAUREUS":           "am_saureus",
  "Gen. 16s":             "gen_16s",
  "Metabolómica":         "metabolomica",
  "Nicolas":              "nicolas",
  "Nombre del Proyecto":  "nombre_proyecto",
}

const FLOAT_FIELDS = new Set<keyof CepaCreate>(["latitud", "longitud"])

// Columnas que nunca se importan aunque no estén en HEADER_MAP
const IGNORED_HEADERS = new Set(["ID"])
const KNOWN_HEADERS = new Set(Object.keys(HEADER_MAP))

// Valores que se interpretan como null
function isNullValue(raw: string): boolean {
  const v = raw.trim().toLowerCase()
  return v === "" || v === "n/i" || v === "n/a"
}


/** Payload con solo los campos conocidos del modelo — para createCepa */
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

/** Detecta columnas extra presentes en cualquier fila del archivo */
function detectExtraHeaders(rawRows: Record<string, string>[]): string[] {
  const extras = new Set<string>()
  for (const raw of rawRows) {
    for (const header of Object.keys(raw)) {
      if (!KNOWN_HEADERS.has(header) && !IGNORED_HEADERS.has(header)) {
        extras.add(header)
      }
    }
  }
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
    ;(row.values as (ExcelJS.CellValue | undefined)[]).slice(1).forEach((cell, i) => {
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

export default function ImportCepas({ existingNames, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [done, setDone] = useState(false)

  const duplicates = rows.filter((r) => r.status === "duplicate")
  const hasDuplicates = duplicates.length > 0

  const reset = () => {
    setRows([])
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
    reset()

    try {
      const rawRows = await getRawRows(file)
      if (rawRows.length === 0) {
        setError("No se encontraron filas en el archivo.")
        return
      }

      const existingSet = new Set(existingNames.map(normalize))
      setRows(rawRows.map((raw) => {
        const name = raw["Cepa"]?.trim() ?? ""
        return { name, status: existingSet.has(normalize(name)) ? "duplicate" : "pending" }
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al procesar el archivo")
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const rawRows = await getRawRows(file)
      const results: ImportRow[] = []

      // --- Fase 1: insertar cepas con campos conocidos ---
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

      // --- Fase 2: añadir columnas extra a todas las cepas del archivo ---
      const extraHeaders = detectExtraHeaders(rawRows)
      console.log("Columnas extra detectadas:", extraHeaders)
      for (const header of extraHeaders) {
        // Construir {cepa_name: valor | null} para todas las filas
        const values: Record<string, string | null> = {}
        for (const raw of rawRows) {
          const name = raw["Cepa"]?.trim() ?? ""
          if (!name) continue
          const v = raw[header]?.trim() ?? ""
          values[name] = isNullValue(v) ? null : v
        }
        try {
          console.log(`Añadiendo atributo extra "${header}" a ${Object.keys(values).length} cepas...`)
          await addAttribute(header, values)
        } catch (e) {
          console.error(`Error añadiendo atributo "${header}":`, e)
        }
      }

      setRows(results)
      setDone(true)
      onImported?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar")
    } finally {
      setLoading(false)
    }
  }

  const okCount = rows.filter((r) => r.status === "ok").length
  const errorCount = rows.filter((r) => r.status === "error").length
  const dupCount = rows.filter((r) => r.status === "duplicate").length

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white hover:file:bg-blue-700"
      />

      {rows.length === 0 && !done && (
        <button
          onClick={handlePrecheck}
          disabled={!file || loading}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Revisando..." : "Comprobar archivo"}
        </button>
      )}

      {rows.length > 0 && !done && (
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            {rows.length} fila(s) encontradas.{" "}
            {hasDuplicates && (
              <span className="text-yellow-400">
                {dupCount} ya existen y serán omitidas.
              </span>
            )}
          </p>

          {hasDuplicates && (
            <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 max-h-40 overflow-y-auto">
              <p className="text-sm font-semibold text-yellow-300 mb-1">Cepas duplicadas:</p>
              <ul className="ml-4 list-disc text-sm text-yellow-200">
                {duplicates.map((r, i) => <li key={i}>{r.name}</li>)}
              </ul>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Entiendo que las cepas duplicadas serán omitidas
              </label>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              disabled={loading || (hasDuplicates && !confirmed)}
              className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Importando..." : "Importar"}
            </button>
            <button onClick={reset} className="rounded bg-gray-700 px-4 py-2 text-gray-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="rounded border border-gray-600 bg-gray-700/50 p-3 text-sm space-y-1">
          <p className="text-green-400">✓ Insertadas: {okCount}</p>
          <p className="text-yellow-400">~ Omitidas (duplicadas): {dupCount}</p>
          {errorCount > 0 && (
            <>
              <p className="text-red-400">✗ Errores: {errorCount}</p>
              <ul className="ml-4 list-disc text-red-300 max-h-32 overflow-y-auto">
                {rows.filter((r) => r.status === "error").map((r, i) => (
                  <li key={i}>{r.name}: {r.error}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  )
}