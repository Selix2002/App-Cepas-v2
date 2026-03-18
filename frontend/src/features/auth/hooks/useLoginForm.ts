// src/features/auth/hooks/useLoginForm.ts
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { loader } from '../../../shared/utils/loader'

export function useLoginForm() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)
        loader(true)

        try {
            await login(username, password) // ya maneja token + user
            navigate('/home')
        } catch {
            setError('Usuario o contraseña inválidos')
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
        isSubmitting,
        handleSubmit,
    }
}
