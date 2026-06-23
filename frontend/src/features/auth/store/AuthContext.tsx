import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { login as apiLogin, getCurrentUser } from "../../users/services/UsersQuery"
import type { User, AuthContextType } from "../../../shared/interfaces"

const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })

  const [user, setUser] = useState<User | null>(() => {
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

  const value: AuthContextType = { user, token, login, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}