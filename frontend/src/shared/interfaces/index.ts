// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export interface Token {
  access_token: string
  token_type: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

// ---------------------------------------------------------------------------
// USER
// ---------------------------------------------------------------------------

export interface User {
  id: string                    // MongoDB ObjectId → string, no number
  username: string
  is_admin: boolean             // snake_case, igual que el backend
  hidden_columns: string[]      // siempre array, nunca undefined
  fecha_creacion: string        // ISO 8601
  fecha_actualizacion: string | null
}

export interface UserCreate {
  username: string
  password: string
  is_admin?: boolean            // default false en backend
  hidden_columns?: string[]
}

export interface UserUpdate {
  username?: string
  is_admin?: boolean
}

// ---------------------------------------------------------------------------
// CEPA
// ---------------------------------------------------------------------------

export interface Cepa {
  id: string                    // MongoDB ObjectId → string, no number
  cepa: string
  codigo_lab: string | null
  origen: string | null
  latitud: number | null
  longitud: number | null
  gram: string | null
  morfologia_1: string | null
  morfologia_2: string | null
  pigmentacion: string | null
  envio_punta_arenas: string | null
  temperatura_80: string | null  // es string en el backend, no number
  medio: string | null

  // Actividades enzimáticas
  lecitinasa: string | null
  ureasa: string | null          // ojo: "ureasa" no "ureasea"
  lipasa: string | null
  amilasa: string | null
  proteasa: string | null
  catalasa: string | null
  celulasa: string | null
  fosfatasa: string | null
  aia: string | null

  // Temperatura de crecimiento
  temp_5c: string | null         // "temp_5c" no "temperatura_5c"
  temp_25c: string | null
  temp_37c: string | null

  // Antibióticos
  amp: string | null
  ctx: string | null
  cxm: string | null
  caz: string | null
  ak: string | null
  c: string | null
  te: string | null
  am_ecoli: string | null
  am_saureus: string | null

  // Identificación molecular
  gen_16s: string | null
  metabolomica: string | null

  // Metadata
  nicolas: string | null
  nombre_proyecto: string | null
  fecha_creacion: string
  fecha_actualizacion: string | null
}

export interface CepaCreate extends Omit<Cepa, "id" | "fecha_creacion" | "fecha_actualizacion"> {}

export interface CepaUpdate extends Partial<Omit<Cepa, "id" | "fecha_creacion" | "fecha_actualizacion">> {}

// ---------------------------------------------------------------------------
// RESPONSES PAGINADOS
// ---------------------------------------------------------------------------

export interface PaginatedCepas {
  total: number
  offset: number
  items: Cepa[]
}

export interface UserList {
  total: number
  items: User[]
}