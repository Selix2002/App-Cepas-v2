// src/features/cepas/hooks/chat/useChatIA.ts
import { useState, useCallback } from "react"
import { postChatQuery, type HistorialMensaje } from "../../services/chatQuery"

const HISTORY_TURNS = 3  // pares user/assistant a enviar

export type ChatRole = "user" | "ia"

export type ChatMessage = {
    id: string
    role: ChatRole
    content: string
    timestamp: Date
    tiempoMs?: number
    isAnimating?: boolean
    filtrosAplicados?: Record<string, string>
    mqlQuery?: Record<string, unknown> | null
}

let nextId = 0
function uid() { return `msg-${++nextId}` }

function simplifyFilters(raw?: Record<string, unknown>): Record<string, string> {
    if (!raw) return {}
    const result: Record<string, string> = {}
    for (const [key, val] of Object.entries(raw)) {
        if (key.startsWith("$")) continue
        if (typeof val === "string" || typeof val === "number") {
            result[key] = String(val)
        } else if (val !== null && typeof val === "object") {
            const obj = val as Record<string, unknown>
            if (typeof obj.$eq === "string" || typeof obj.$eq === "number") {
                result[key] = String(obj.$eq)
            } else if (Array.isArray(obj.$in) && obj.$in.length > 0) {
                result[key] = String(obj.$in[0])
            } else if (typeof obj.$regex === "string") {
                result[key] = obj.$regex
            }
        }
    }
    return result
}

export function useChatIA() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const sendMessage = useCallback(async (text: string) => {
        const trimmed = text.trim()
        if (!trimmed || isLoading) return

        setError(null)

        const userMsg: ChatMessage = {
            id: uid(),
            role: "user",
            content: trimmed,
            timestamp: new Date(),
        }
        setMessages((prev) => [...prev, userMsg])
        setIsLoading(true)

        try {
            // Tomar los últimos N pares user/ia del historial actual (antes de agregar el nuevo)
            const historial: HistorialMensaje[] = messages
                .filter((m) => m.role === "user" || m.role === "ia")
                .slice(-(HISTORY_TURNS * 2))
                .map((m) => ({
                    role: m.role === "ia" ? "assistant" : "user",
                    content: m.content,
                }))

            const data = await postChatQuery({ pregunta: trimmed, incluir_fuentes: true, historial })
            const filtrosAplicados = simplifyFilters(data.debug?.filtros_aplicados)
            const iaMsg: ChatMessage = {
                id: uid(),
                role: "ia",
                content: data.respuesta,
                timestamp: new Date(),
                tiempoMs: data.tiempo_respuesta_ms,
                isAnimating: true,
                filtrosAplicados: Object.keys(filtrosAplicados).length > 0 ? filtrosAplicados : undefined,
                mqlQuery: data.debug?.mql_query ?? null,
            }
            setMessages((prev) => [...prev, iaMsg])
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error desconocido"
            setError(msg)
            const errMsg: ChatMessage = {
                id: uid(),
                role: "ia",
                content: `⚠ ${msg}`,
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errMsg])
        } finally {
            setIsLoading(false)
        }
    }, [isLoading, messages])

    const clearMessages = useCallback(() => {
        setMessages([])
        setError(null)
    }, [])

    return { messages, isLoading, error, sendMessage, clearMessages }
}
