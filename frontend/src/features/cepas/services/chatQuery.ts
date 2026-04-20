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

export interface ChatDebugInfo {
    filtros_aplicados: Record<string, unknown>
    modo_busqueda: string
    terminos_detectados: string[]
    cepas_en_contexto: number
    total_en_db: number
    mql_query?: Record<string, unknown> | null
}

export interface ChatQueryResponse {
    respuesta: string
    modelo_usado: string
    tiempo_respuesta_ms?: number
    debug?: ChatDebugInfo
}

export async function postChatQuery(payload: ChatQueryPayload): Promise<ChatQueryResponse> {
    const { data } = await api.post<ChatQueryResponse>("/chat/query", payload)
    return data
}
