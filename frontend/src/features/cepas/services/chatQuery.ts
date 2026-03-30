import { api } from "../../../shared/services/api"

// ---------------------------------------------------------------------------
// POST /chat/query
// ---------------------------------------------------------------------------

export interface HistorialMensaje {
    role: "user" | "assistant"
    content: string
}

export interface ChatQueryPayload {
    pregunta: string
    incluir_fuentes?: boolean
    historial?: HistorialMensaje[]
}

export interface ChatQueryResponse {
    respuesta: string
    modelo_usado: string
    tiempo_respuesta_ms?: number
}

export async function postChatQuery(payload: ChatQueryPayload): Promise<ChatQueryResponse> {
    const { data } = await api.post<ChatQueryResponse>("/chat/query", payload)
    return data
}
