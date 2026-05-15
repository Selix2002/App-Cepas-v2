import type { Cepa, CepaCreate, CepaUpdate, PaginatedCepas } from "../../../shared/interfaces"
import { api } from "../../../shared/services/api"

// ---------------------------------------------------------------------------
// GET ALL
// ---------------------------------------------------------------------------

export interface CepaFilters {
  origen?: string
  cepa?: string        // búsqueda parcial por nombre
}

export async function getCepas(filters?: CepaFilters): Promise<PaginatedCepas> {
  const { data } = await api.get<PaginatedCepas>("/cepas/", { params: filters })
  return data
}

// ---------------------------------------------------------------------------
// GET BY ID
// ---------------------------------------------------------------------------

export async function getCepaById(id: string): Promise<Cepa> {
  const { data } = await api.get<Cepa>(`/cepas/${id}`)
  return data
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------

export async function createCepa(payload: CepaCreate): Promise<Cepa> {
  const { data } = await api.post<Cepa>("/cepas/", payload)
  return data
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------

export async function updateCepa(id: string, payload: CepaUpdate): Promise<Cepa> {
  const { data } = await api.patch<Cepa>(`/cepas/${id}`, payload)
  return data
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function deleteCepa(id: string): Promise<void> {
  await api.delete<void>(`/cepas/${id}`)
}

// ---------------------------------------------------------------------------
// ADD ATTRIBUTE — añade un campo nuevo a múltiples cepas
// ---------------------------------------------------------------------------

export interface AddAttributeResult {
  updated: number
  not_found: string[]
}

export async function addAttribute(
  attributeName: string,
  values: Record<string, string | null>
): Promise<AddAttributeResult> {
  const { data } = await api.post<AddAttributeResult>("/cepas/add-attribute", {
    attribute_name: attributeName,
    values,
  })
  return data
}

// ---------------------------------------------------------------------------
// IMPORT — importa cepas desde CSV o Excel (backend parsea el archivo)
// ---------------------------------------------------------------------------

export interface ImportRowResult {
  cepa: string
  status: "created" | "duplicate" | "error"
  error?: string
}

export interface ImportResult {
  created: number
  skipped: number
  errors: number
  rows: ImportRowResult[]
}

// ---------------------------------------------------------------------------
// FIELD LABELS — mapa field_name→label original para columnas dinámicas
// ---------------------------------------------------------------------------

export async function getFieldLabels(): Promise<Record<string, string>> {
  const { data } = await api.get<Record<string, string>>("/cepas/labels")
  return data
}

export async function importCepas(file: File): Promise<ImportResult> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post<ImportResult>("/cepas/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return data
}