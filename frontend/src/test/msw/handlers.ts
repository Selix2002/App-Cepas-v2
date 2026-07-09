import { http, HttpResponse } from "msw"
import type { Token, User } from "../../shared/interfaces"

const API_URL = "http://localhost:8000"

export const DEFAULT_USER: User = {
  id: "user-1",
  username: "admin",
  is_admin: true,
  hidden_columns: [],
  fecha_creacion: "2026-01-01T00:00:00Z",
  fecha_actualizacion: null,
}

export const DEFAULT_TOKEN: Token = {
  access_token: "fake-jwt-token",
  token_type: "bearer",
}

export const handlers = [
  http.post(`${API_URL}/auth/login`, () => {
    return HttpResponse.json(DEFAULT_TOKEN, { status: 201 })
  }),
  http.get(`${API_URL}/users/me`, () => {
    return HttpResponse.json(DEFAULT_USER)
  }),
]
