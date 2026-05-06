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
  id: string
  cepa: string
  latitud: number | null
  longitud: number | null
  envio_punta_arenas: string | null
  fecha_creacion: string
  fecha_actualizacion: string | null
  // Atributos dinámicos — cualquier columna adicional del CSV/Excel
  [key: string]: unknown
}

export interface CepaCreate {
  cepa: string
  latitud?: number | null
  longitud?: number | null
  envio_punta_arenas?: string | null
  [key: string]: unknown
}

export interface CepaUpdate {
  cepa?: string
  latitud?: number | null
  longitud?: number | null
  envio_punta_arenas?: string | null
  [key: string]: unknown
}

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