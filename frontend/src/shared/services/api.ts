// src/services/api.ts
import axios from "axios";

// Lee la variable de entorno VITE_API_URL definida por Vite
const baseURL = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});
// Interceptor: antes de cada request, mete el token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Sesión vencida (F2) ──────────────────────────────────────────────────────
// El backend responde 401 cuando el token expiró o ya no es válido (la falta de rol
// admin es 403, no 401). AuthContext registra aquí cómo cerrar la sesión.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    const sentToken = !!error?.config?.headers?.Authorization;
    // El 401 del propio login significa credenciales inválidas, no sesión vencida
    if (status === 401 && sentToken && !url.includes("/auth/login")) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);
