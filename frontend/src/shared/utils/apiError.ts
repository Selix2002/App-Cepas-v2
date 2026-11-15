// src/shared/utils/apiError.ts
// Traduce un error de axios a un mensaje en español apto para mostrar al usuario,
// en vez del "Request failed with status code 429" genérico de axios.
import { isAxiosError } from "axios"

export type ApiErrorContext = "login" | "chat" | "general"

/** Segundos a esperar según la respuesta 429 (body o header Retry-After). */
export function getRetryAfterSeconds(err: unknown): number | null {
    if (!isAxiosError(err) || !err.response) return null
    const body = err.response.data as { retry_after_seconds?: unknown } | undefined
    const fromBody = Number(body?.retry_after_seconds)
    if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody)
    const fromHeader = Number(err.response.headers?.["retry-after"])
    if (Number.isFinite(fromHeader) && fromHeader > 0) return Math.ceil(fromHeader)
    return null
}

function waitText(seconds: number | null): string {
    if (!seconds) return "Espere un momento"
    if (seconds < 60) return `Espere ${seconds} segundo${seconds === 1 ? "" : "s"}`
    const min = Math.ceil(seconds / 60)
    return `Espere ${min} minuto${min === 1 ? "" : "s"}`
}

export function getApiErrorMessage(err: unknown, context: ApiErrorContext = "general"): string {
    if (!isAxiosError(err)) {
        return err instanceof Error ? err.message : "Ocurrió un error inesperado."
    }

    // Sin respuesta: timeout o sin conexión
    if (!err.response) {
        if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
            return context === "chat"
                ? "La consulta tardó demasiado en responder. Intente de nuevo o reformule la pregunta."
                : "El servidor tardó demasiado en responder. Intente nuevamente."
        }
        return "No se pudo conectar con el servidor. Revise su conexión a internet e intente nuevamente."
    }

    const { status } = err.response
    const detail = (err.response.data as { detail?: unknown } | undefined)?.detail

    switch (status) {
        case 401:
            return context === "login"
                ? "Usuario o contraseña inválidos."
                : "Su sesión expiró. Ingrese nuevamente."
        case 403:
            return "No tiene permisos para realizar esta acción."
        case 429: {
            const wait = waitText(getRetryAfterSeconds(err))
            if (context === "login")
                return `Demasiados intentos de ingreso. ${wait} e intente nuevamente.`
            if (context === "chat")
                return `Alcanzó el límite de 10 preguntas por minuto. ${wait} antes de volver a preguntar.`
            return `Demasiadas solicitudes. ${wait} e intente nuevamente.`
        }
        case 503:
            return "El servicio no está disponible en este momento. Intente nuevamente en unos minutos."
    }

    if (status >= 500) {
        return "Ocurrió un error en el servidor. Intente nuevamente; si persiste, avise al administrador."
    }
    if (typeof detail === "string" && detail.trim()) return detail
    return "No se pudo completar la operación."
}
