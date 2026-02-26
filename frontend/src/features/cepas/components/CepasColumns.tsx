import type { ColDef } from "ag-grid-community"

export const getCepasColumnDefs = (): ColDef[] => {
  const fixedCols: ColDef[] = [
    {
      headerName: "Cepa",
      field: "cepa",
      filter: "agTextColumnFilter",
      pinned: "left",
      width: 120,
      sort: "asc",
    },
    {
      headerName: "Código Lab",
      field: "codigo_lab",          // era "cod_lab"
      filter: "agTextColumnFilter",
      width: 120,
    },
    {
      headerName: "Origen",
      field: "origen",
      filter: "agTextColumnFilter",
      width: 150,
    },
    {
      headerName: "Latitud",
      field: "latitud",
      filter: "agNumberColumnFilter",
      width: 120,
    },
    {
      headerName: "Longitud",
      field: "longitud",
      filter: "agNumberColumnFilter",
      width: 120,
    },
    {
      headerName: "Pigmentación",
      field: "pigmentacion",
      filter: "agTextColumnFilter",
      width: 130,
    },
    {
      headerName: "Envío a Punta Arenas",
      field: "envio_punta_arenas",   // era "almacenamiento.envio_puq"
      filter: "agTextColumnFilter",
      wrapHeaderText: true,
      autoHeaderHeight: true,
      width: 150,
    },
    {
      headerName: "Temperatura -80°",
      field: "temperatura_80",       // era "almacenamiento.temperatura_menos80"
      filter: "agTextColumnFilter",
      width: 140,
    },
    {
      headerName: "Medio",
      field: "medio",                // era "medio_cultivo.medio"
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "Gram",
      field: "gram",                 // era "morfologia.gram"
      filter: "agTextColumnFilter",
      width: 80,
    },
    {
      headerName: "Morfología 1",
      field: "morfologia_1",         // era "morfologia.morfologia_1"
      filter: "agTextColumnFilter",
      width: 130,
    },
    {
      headerName: "Morfología 2",
      field: "morfologia_2",
      filter: "agTextColumnFilter",
      width: 130,
    },
    {
      headerName: "Lecitinasa",
      field: "lecitinasa",           // era "actividad_enzimatica.lecitinasa"
      filter: "agTextColumnFilter",
      width: 110,
    },
    {
      headerName: "Ureasa",
      field: "ureasa",
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "Lipasa",
      field: "lipasa",
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "Amilasa",
      field: "amilasa",
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "Proteasa",
      field: "proteasa",
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "Catalasa",
      field: "catalasa",
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "Celulasa",
      field: "celulasa",
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "Fosfatasa",
      field: "fosfatasa",
      filter: "agTextColumnFilter",
      width: 100,
    },
    {
      headerName: "AIA",
      field: "aia",
      filter: "agTextColumnFilter",
      width: 80,
    },
    {
      headerName: "+ 5°C",
      field: "temp_5c",              // era "crecimiento_temperatura.temp_5"
      filter: "agTextColumnFilter",
      width: 90,
    },
    {
      headerName: "+ 25°C",
      field: "temp_25c",
      filter: "agTextColumnFilter",
      width: 90,
    },
    {
      headerName: "+ 37°C",
      field: "temp_37c",
      filter: "agTextColumnFilter",
      width: 90,
    },
    {
      headerName: "AMP",
      field: "amp",                  // era "resistencia_antibiotica.amp"
      filter: "agTextColumnFilter",
      width: 80,
    },
    {
      headerName: "CTX",
      field: "ctx",
      filter: "agTextColumnFilter",
      width: 80,
    },
    {
      headerName: "CXM",
      field: "cxm",
      filter: "agTextColumnFilter",
      width: 80,
    },
    {
      headerName: "CAZ",
      field: "caz",
      filter: "agTextColumnFilter",
      width: 80,
    },
    {
      headerName: "AK",
      field: "ak",
      filter: "agTextColumnFilter",
      width: 80,
    },
    {
      headerName: "C",
      field: "c",
      filter: "agTextColumnFilter",
      width: 70,
    },
    {
      headerName: "TE",
      field: "te",
      filter: "agTextColumnFilter",
      width: 70,
    },
    {
      headerName: "AM E.COLI",
      field: "am_ecoli",
      filter: "agTextColumnFilter",
      width: 110,
    },
    {
      headerName: "AM SAUREUS",
      field: "am_saureus",
      filter: "agTextColumnFilter",
      width: 120,
    },
    {
      headerName: "Gen. 16s",
      field: "gen_16s",              // era "caracterizacion_genetica.gen_16s"
      filter: "agTextColumnFilter",
      width: 150,
    },
    {
      headerName: "Metabolómica",
      field: "metabolomica",
      filter: "agTextColumnFilter",
      width: 130,
    },
    {
      headerName: "Nicolas",
      field: "nicolas",              // era "proyecto.responsable"
      filter: "agTextColumnFilter",
      width: 110,
    },
    {
      headerName: "Nombre del Proyecto",
      field: "nombre_proyecto",      // era "proyecto.nombre_proyecto"
      filter: "agTextColumnFilter",
      width: 180,
    },
  ]

  return fixedCols
}

// Campos fijos conocidos — para detectar los dinámicos por exclusión
const KNOWN_FIELDS = new Set([
  "id", "cepa", "codigo_lab", "origen", "latitud", "longitud", "gram",
  "morfologia_1", "morfologia_2", "pigmentacion", "envio_punta_arenas",
  "temperatura_80", "medio", "lecitinasa", "ureasa", "lipasa", "amilasa",
  "proteasa", "catalasa", "celulasa", "fosfatasa", "aia", "temp_5c",
  "temp_25c", "temp_37c", "amp", "ctx", "cxm", "caz", "ak", "c", "te",
  "am_ecoli", "am_saureus", "gen_16s", "metabolomica", "nicolas",
  "nombre_proyecto", "fecha_creacion", "fecha_actualizacion",
])

export const getCepasColumnDefsWithExtras = (data: Record<string, unknown>[]): ColDef[] => {
  const fixedCols = getCepasColumnDefs()

  // Detectar campos extra presentes en cualquier cepa
  const extraKeys = Array.from(
    new Set(
      data.flatMap((row) =>
        Object.keys(row).filter((key) => !KNOWN_FIELDS.has(key))
      )
    )
  )
  const extraCols: ColDef[] = extraKeys.map((key) => ({
    headerName: key,
    field: key,
    filter: "agTextColumnFilter",
    width: 150,
  }))

  return [...fixedCols, ...extraCols]
}