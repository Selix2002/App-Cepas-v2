// src/features/auth/store/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'
import { login as apiLogin, getCurrentUser } from '../../users/services/UsersQuery'
import type { User, AuthContextType } from '../../../shared/interfaces'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // 1) Estado inicial leído directamente de localStorage (esto es clave)
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

  // 2) Cada vez que cambie el token, ajusto axios y, si hace falta, refresco user
  useEffect(() => {
    if (!token) {
      // solo limpiar usuario si hace falta
      return;
    }

    // Si aún no tengo user en memoria, lo pido a la API
    if (!user) {
      getCurrentUser()
        .then(u => {
          setUser(u)
          localStorage.setItem(USER_KEY, JSON.stringify(u))
        })
        .catch(() => {
          // Token inválido → limpio todo
          setToken(null)
          setUser(null)
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
        })
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps


  // 3) Login
  const login = async (username: string, password: string) => {
    const { accessToken } = await apiLogin(username, password) // asumo que tu API devuelve esto

    localStorage.setItem(TOKEN_KEY, accessToken)
    setToken(accessToken) // esto dispara el useEffect de arriba

    const u = await getCurrentUser()
    setUser(u)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  // 4) Logout
  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    delete axios.defaults.headers.common['Authorization']
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
