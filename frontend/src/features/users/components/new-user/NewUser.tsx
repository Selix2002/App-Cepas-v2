// src/features/users/components/new-user/NewUser.tsx
import { useEffect, useState, type KeyboardEvent } from "react"
import { createUser } from "../../services/UsersQuery"
import type { User } from "../../../../shared/interfaces"
import "./new-user.css"

interface Props {
    visible: boolean
    onCreated: (user: User) => void
    onCancel: () => void
}

export default function NewUser({ visible, onCreated, onCancel }: Props) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [isAdmin, setIsAdmin] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    // Resetear campos al abrir
    useEffect(() => {
        if (visible) {
            setUsername("")
            setPassword("")
            setIsAdmin(false)
            setError("")
        }
    }, [visible])

    // ESC para cerrar
    useEffect(() => {
        if (!visible) return
        const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onCancel() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [visible, onCancel])

    if (!visible) return null

    const handleSubmit = async () => {
        const trimmedUser = username.trim()
        const trimmedPwd = password.trim()

        if (!trimmedUser) { setError("El nombre de usuario es obligatorio."); return }
        if (trimmedPwd.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return }

        setError("")
        setLoading(true)
        try {
            const nuevo = await createUser({ username: trimmedUser, password: trimmedPwd, is_admin: isAdmin })
            onCreated(nuevo)
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string }
            const detail = axiosErr?.response?.data?.detail ?? axiosErr?.message ?? "Error desconocido"
            setError(`No se pudo crear el usuario: ${detail}`)
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSubmit()
    }

    return (
        <div className="nu-overlay">
            <div className="nu-backdrop" onClick={onCancel} />

            <div className="nu-card">
                <div className="nu-accent" />

                {/* header */}
                <div className="nu-header">
                    <span className="nu-hex">⬡</span>
                    <span className="nu-title">Nuevo Usuario</span>
                    <span className="nu-subtitle">— crear cuenta</span>
                    <button className="nu-close" onClick={onCancel} aria-label="Cerrar">✕</button>
                </div>

                {/* body */}
                <div className="nu-body">
                    <div className="nu-field">
                        <label className="nu-label required" htmlFor="nu-username">Nombre de usuario</label>
                        <input
                            id="nu-username"
                            className="nu-input"
                            type="text"
                            placeholder="ej. jdoe"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                    </div>

                    <div className="nu-field">
                        <label className="nu-label required" htmlFor="nu-password">Contraseña</label>
                        <input
                            id="nu-password"
                            className="nu-input"
                            type="password"
                            placeholder="mínimo 8 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>

                    <label className="nu-toggle-row">
                        <input
                            type="checkbox"
                            className="nu-checkbox"
                            checked={isAdmin}
                            onChange={(e) => setIsAdmin(e.target.checked)}
                        />
                        <span className="nu-toggle-label">Otorgar permisos de administrador</span>
                    </label>

                    {error && <div className="nu-error">{error}</div>}
                </div>

                {/* footer */}
                <div className="nu-footer">
                    <button className="nu-btn nu-btn-cancel" onClick={onCancel} disabled={loading}>
                        Cancelar
                    </button>
                    <button className="nu-btn nu-btn-submit" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Creando…" : "Crear Usuario"}
                    </button>
                </div>
            </div>
        </div>
    )
}
