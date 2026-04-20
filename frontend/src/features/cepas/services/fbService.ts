// src/features/cepas/services/fbService.ts
import { api } from "../../../shared/services/api"

// ---------------------------------------------------------------------------
// POST /chat/feedback
// ---------------------------------------------------------------------------

export interface FeedbackPayload {
    pregunta:      string
    respuesta:     string
    calificacion:  number          // 1–5
    comentario?:   string | null
    modo_busqueda?: string | null
    mql_query?:    Record<string, unknown> | null
}

export interface FeedbackResponse {
    mensaje: string
    id:      string
}

export async function postFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    const { data } = await api.post<FeedbackResponse>("/chat/feedback", payload)
    return data
}
