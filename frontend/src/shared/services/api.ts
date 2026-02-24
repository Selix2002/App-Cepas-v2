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
