import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { login as apiLogin, getCurrentUser } from "../../users/services/UsersQuery"
import { setUnauthorizedHandler } from "../../../shared/services/api"
import type { User, AuthContextType } from "../../../shared/interfaces"

const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"
/** Marca (sessionStorage) para que la pantalla de login avise que la sesión expiró. */
export const SESSION_EXPIRED_KEY = "auth_session_expired"

/** true si el JWT ya venció según su claim `exp`. Si no se puede leer, decide el
 *  backend: un token inválido recibe 401 y el interceptor cierra la sesión. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1]
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    const { exp } = JSON.parse(json) as { exp?: number }
    return typeof exp === "number" && exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

function readStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token && isTokenExpired(token)) {
    // Token vencido mientras la app estaba cerrada → no entrar con una sesión muerta
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.setItem(SESSION_EXPIRED_KEY, "1")
    return null
  }
  return token
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken)

  const [user, setUser] = useState<User | null>(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return null
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      localStorage.removeItem(USER_KEY)
      return null
    }
  })

  // Si hay token pero no user (ej: refresh de página), rehydratar el user desde la API
  useEffect(() => {
    if (!token || user) return

    getCurrentUser()
      .then((u) => {
        setUser(u)
        localStorage.setItem(USER_KEY, JSON.stringify(u))
      })
      .catch(() => {
        // Token expirado o inválido → limpiar todo
        setToken(null)
        setUser(null)
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (username: string, password: string) => {
    // apiLogin retorna el token; el interceptor de `api` lo inyecta en cada request leyéndolo de localStorage
    const accessToken = await apiLogin(username, password)
    localStorage.setItem(TOKEN_KEY, accessToken)
    setToken(accessToken)

    const u = await getCurrentUser()
    setUser(u)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  // F2: cualquier 401 de la API con sesión iniciada = sesión vencida → cerrar sesión.
  // PrivateRoute redirige a /login al quedar el token en null.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!localStorage.getItem(TOKEN_KEY)) return
      sessionStorage.setItem(SESSION_EXPIRED_KEY, "1")
      logout()
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const value: AuthContextType = { user, token, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}