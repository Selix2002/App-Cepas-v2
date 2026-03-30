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
}

let nextId = 0
function uid() { return `msg-${++nextId}` }

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
            const iaMsg: ChatMessage = {
                id: uid(),
                role: "ia",
                content: data.respuesta,
                timestamp: new Date(),
                tiempoMs: data.tiempo_respuesta_ms,
                isAnimating: true,
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
