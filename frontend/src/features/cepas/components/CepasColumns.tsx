// src/features/cepas/components/CepasColumns.ts
// Ya no depende de ag-grid-community
import type { CepaColumnDef } from "../types/tableTypes"

export const getCepasColumnDefs = (): CepaColumnDef[] => [
  { field: "cepa",               headerName: "Cepa",                 pinned: true, width: 120, type: "text" },
  { field: "codigo_lab",         headerName: "Código Lab",            width: 120,  type: "text" },
  { field: "origen",             headerName: "Origen",                width: 150,  type: "text" },
  { field: "latitud",            headerName: "Latitud",               width: 100,  type: "number" },
  { field: "longitud",           headerName: "Longitud",              width: 100,  type: "number" },
  { field: "pigmentacion",       headerName: "Pigmentación",          width: 130,  type: "text" },
  { field: "envio_punta_arenas", headerName: "Envío Pta. Arenas",     width: 120,  type: "date" },
  { field: "temperatura_80",     headerName: "Temp -80°",             width: 100,  type: "text" },
  { field: "medio",              headerName: "Medio",                 width: 90,   type: "text" },
  { field: "gram",               headerName: "Gram",                  width: 70,   type: "text" },
  { field: "morfologia_1",       headerName: "Morfología 1",          width: 110,  type: "text" },
  { field: "morfologia_2",       headerName: "Morfología 2",          width: 110,  type: "text" },
  { field: "lecitinasa",         headerName: "Lecitinasa",            width: 90,   type: "text" },
  { field: "ureasa",             headerName: "Ureasa",                width: 80,   type: "text" },
  { field: "lipasa",             headerName: "Lipasa",                width: 75,   type: "text" },
  { field: "amilasa",            headerName: "Amilasa",               width: 80,   type: "text" },
  { field: "proteasa",           headerName: "Proteasa",              width: 85,   type: "text" },
  { field: "catalasa",           headerName: "Catalasa",              width: 80,   type: "text" },
  { field: "celulasa",           headerName: "Celulasa",              width: 80,   type: "text" },
  { field: "fosfatasa",          headerName: "Fosfatasa",             width: 85,   type: "text" },
  { field: "aia",                headerName: "AIA",                   width: 70,   type: "text" },
  { field: "temp_5c",            headerName: "+ 5°C",                 width: 80,   type: "text" },
  { field: "temp_25c",           headerName: "+ 25°C",                width: 80,   type: "text" },
  { field: "temp_37c",           headerName: "+ 37°C",                width: 80,   type: "text" },
  { field: "amp",                headerName: "AMP",                   width: 70,   type: "text" },
  { field: "ctx",                headerName: "CTX",                   width: 70,   type: "text" },
  { field: "cxm",                headerName: "CXM",                   width: 70,   type: "text" },
  { field: "caz",                headerName: "CAZ",                   width: 70,   type: "text" },
  { field: "ak",                 headerName: "AK",                    width: 65,   type: "text" },
  { field: "c",                  headerName: "C",                     width: 55,   type: "text" },
  { field: "te",                 headerName: "TE",                    width: 55,   type: "text" },
  { field: "am_ecoli",           headerName: "AM E.Coli",             width: 100,  type: "text" },
  { field: "am_saureus",         headerName: "AM S.Aureus",           width: 110,  type: "text" },
  { field: "gen_16s",            headerName: "Gen. 16S",              width: 150,  type: "text" },
  { field: "metabolomica",       headerName: "Metabolómica",          width: 120,  type: "text" },
  { field: "nicolas",            headerName: "Nicolas",               width: 100,  type: "text" },
  { field: "nombre_proyecto",    headerName: "Nombre Proyecto",       width: 170,  type: "text" },
]

const KNOWN_FIELDS = new Set([
  "id", "cepa", "codigo_lab", "origen", "latitud", "longitud", "gram",
  "morfologia_1", "morfologia_2", "pigmentacion", "envio_punta_arenas",
  "temperatura_80", "medio", "lecitinasa", "ureasa", "lipasa", "amilasa",
  "proteasa", "catalasa", "celulasa", "fosfatasa", "aia", "temp_5c",
  "temp_25c", "temp_37c", "amp", "ctx", "cxm", "caz", "ak", "c", "te",
  "am_ecoli", "am_saureus", "gen_16s", "metabolomica", "nicolas",
  "nombre_proyecto", "fecha_creacion", "fecha_actualizacion",
])

/** Añade columnas dinámicas no previstas en el modelo base */
export const getCepasColumnDefsWithExtras = (
  data: Record<string, unknown>[]
): CepaColumnDef[] => {
  const base = getCepasColumnDefs()
  const extraKeys = Array.from(
    new Set(data.flatMap((row) => Object.keys(row).filter((k) => !KNOWN_FIELDS.has(k))))
  )
  const extras: CepaColumnDef[] = extraKeys.map((k) => ({
    field: k,
    headerName: k,
    width: 150,
    type: "text",
  }))
  return [...base, ...extras]
}
