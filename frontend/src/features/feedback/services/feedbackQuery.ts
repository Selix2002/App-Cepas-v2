// src/features/feedback/services/feedbackQuery.ts
import { api } from "../../../shared/services/api"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedbackStats {
    total: number
    promedio_calificacion: number
    distribucion: Record<string, number>
    total_con_comentario: number
}

export interface FeedbackListItem {
    id: string
    pregunta: string
    respuesta: string
    calificacion: number
    comentario: string | null
    fecha: string
    modelo_usado: string
    modo_busqueda: string | null
    mql_query: Record<string, unknown> | null
}

export interface FeedbackListResponse {
    items: FeedbackListItem[]
    total: number
    page: number
    page_size: number
    total_pages: number
}

export interface FeedbackListParams {
    page?: number
    page_size?: number
    sort_by?: "fecha" | "calificacion"
    order?: "asc" | "desc"
    calificacion?: number | null
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function getFeedbackStats(): Promise<FeedbackStats> {
    const { data } = await api.get<FeedbackStats>("/chat/feedback/stats")
    return data
}

export async function getFeedbackList(params: FeedbackListParams = {}): Promise<FeedbackListResponse> {
    const { data } = await api.get<FeedbackListResponse>("/chat/feedback", {
        params: {
            page: params.page ?? 1,
            page_size: params.page_size ?? 20,
            sort_by: params.sort_by ?? "fecha",
            order: params.order ?? "desc",
            ...(params.calificacion != null ? { calificacion: params.calificacion } : {}),
        },
    })
    return data
}
