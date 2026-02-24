// src/features/auth/services/authSession.ts
import axios from 'axios'
import type { User } from '../../../shared/interfaces'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

function setAxiosAuthHeader(token: string | null) {
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
        delete axios.defaults.headers.common['Authorization']
    }
}

/**
 * Se ejecuta al montar el AuthProvider:
 * - Lee token y user desde localStorage.
 * - Configura el header Authorization de axios si hay token.
 */
export function initAuthFromStorage(): { token: string | null; user: User | null } {
    const token = localStorage.getItem(TOKEN_KEY)
    let user: User | null = null

    const rawUser = localStorage.getItem(USER_KEY)
    if (rawUser) {
        try {
            user = JSON.parse(rawUser) as User
        } catch {
            localStorage.removeItem(USER_KEY)
        }
    }

    if (token) {
        setAxiosAuthHeader(token)
    }

    return { token, user }
}

/**
 * Guarda token + user y actualiza el header de axios.
 */
export function persistAuth(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setAxiosAuthHeader(token)
}

/**
 * Limpia todo rastro de autenticación.
 */
export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAxiosAuthHeader(null)
}
