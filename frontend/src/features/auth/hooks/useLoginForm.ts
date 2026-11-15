// src/features/auth/hooks/useLoginForm.ts
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { loader } from '../../../shared/utils/loader'
import { getApiErrorMessage } from '../../../shared/utils/apiError'
import { SESSION_EXPIRED_KEY } from '../store/AuthContext'

/** Lee y consume el aviso de sesión vencida (se muestra una sola vez). */
function consumeSessionExpired(): boolean {
    const expired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1'
    sessionStorage.removeItem(SESSION_EXPIRED_KEY)
    return expired
}

export function useLoginForm() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<string | null>(() =>
        consumeSessionExpired() ? 'Su sesión expiró. Ingrese nuevamente.' : null
    )
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setNotice(null)
        setIsSubmitting(true)
        loader(true)

        try {
            await login(username, password) // ya maneja token + user
            navigate('/home')
        } catch (err) {
            setError(getApiErrorMessage(err, 'login'))
        } finally {
            setIsSubmitting(false)
            loader(false)
        }
    }

    return {
        username,
        setUsername,
        password,
        setPassword,
        error,
        notice,
        isSubmitting,
        handleSubmit,
    }
}
