import axios from "axios";
import type {CepaUpdatePayload } from "../../../shared/interfaces/index";
import {api} from "../../../shared/services/api";
/**
 * Fetch de cepas con control de errores y validación de datos.
 * @returns Promise<any[]>: array de cepas o array vacío si hay error o datos inválidos.
 */
export const fetchCepasFull = (): Promise<any[]> =>
  api
    .get("/cepas/get-all")
    .then((res) => {
      // Validamos que res.data sea un array
      if (!res.data || !Array.isArray(res.data)) {
        console.error("fetchCepasFull → datos inválidos:", res.data);
        return [];
      }
      return res.data;
    })
    .catch((error) => {
      // Errores de red, timeout, 5xx, etc.
      if (axios.isAxiosError(error)) {
        console.error(
          `fetchCepasFull AxiosError [${error.response?.status}]:`,
          error.message
        );
      } else {
        console.error("fetchCepasFull Error inesperado:", error);
      }
      return [];
      
    });

    /**

/**
 * Define aquí la forma exacta del payload que acepta el DTO de update en el backend.
 */

/**
 * updateCepa: envía un PATCH a /cepas/update/{cepaId}
 */
export const updateCepa = (
  cepaId: number,
  data: CepaUpdatePayload
): Promise<any> =>
  api
    .patch(`/cepas/update/${cepaId}`, data)
    .then((res) => res.data)
    .catch((error) => {
      console.error(`Error al actualizar la cepa ${cepaId}:`, error);
      throw error;
    });
    
    

/**
 * Recorre el diccionario subido y, para cada cepa,
 * lanza un PATCH al endpoint /cepas/update-jsonb/:cepaNombre
 * insertando en su JSONB la nueva clave (attribute_name) con
 * el valor correspondiente.
 */
export async function updateCepasJSONB(
  fileDict: Record<string, string>
): Promise<void> {
  const { attribute_name: newKey, ...values } = fileDict;
  if (!newKey) {
    throw new Error("La clave `attribute_name` es obligatoria");
  }

  const requests = Object.entries(values).map(([cepaNombre, valor]) =>
    api.patch(
      `/cepas/update-jsonb/${encodeURIComponent(cepaNombre)}`,
      {
        datos_extra: { [newKey]: valor },
      }
    )
  );

  await Promise.all(requests);
}

export async function updateCepasJSONB_forTable(
  fileDict: Record<string, string>,
  existingDatosExtras: Record<string, Record<string, any>>
): Promise<void> {
  const { attribute_name: newKey, ...values } = fileDict;
  if (!newKey) {
    throw new Error("La clave `attribute_name` es obligatoria");
  }
  console.log(fileDict);
  const requests = Object.entries(values).map(([cepaNombre, valor]) => {
    // 1) obtenemos el objeto actual (o uno vacío si no existe)
    const current = existingDatosExtras[cepaNombre] ?? {};
    // 2) mergeamos la nueva clave/valor
    const mergedDatosExtra = { ...current, [newKey]: valor };

    // 3) enviamos TODO el objeto merged
    console.log("🔁 [updateCepasJSONB] payload:", { datos_extra: mergedDatosExtra });
    return api.patch(
      `/cepas/update-jsonb/${encodeURIComponent(cepaNombre)}`,
      { datos_extra: mergedDatosExtra }
    );
  });

  await Promise.all(requests);
}


// === Crear nueva cepa en /cepas/create ===
const toFloatOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s || s.toUpperCase() === "N/I") return null;
    const n = Number(s.replace(",", ".")); // soporta coma decimal
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const clamp = (n: number | null, min: number, max: number): number | null =>
  n == null ? null : Math.min(max, Math.max(min, n));

/** Normaliza solo los campos lat/long; el resto del payload queda igual */
export const normalizeLatLng = <T extends Record<string, any>>(data: T): T => {
  const lat = clamp(toFloatOrNull(data.latitud), -90, 90);
  const lng = clamp(toFloatOrNull(data.longitud), -180, 180);
  return { ...data, latitud: lat, longitud: lng };
};

export async function createCepa(data: Record<string, any>): Promise<any> {
  const payload = normalizeLatLng(data);
  try {
    const res = await api.post("/cepas/create", payload);
    return res.data;
  } catch (error) {
    console.error("Error al crear la cepa:", error);
    console.log("Payload normalizado", payload);
    throw error;
  }
}


// === Importar Excel/CSV a /cepas/import ===

export interface ImportIssue {
  row_index: number;
  error: string;
  row_data?: Record<string, any> | null;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  errors: ImportIssue[];
  warnings: string[];
}

/**
 * importCepas: envía un archivo .xlsx o .csv al endpoint de importación.
 * @param file Archivo Excel/CSV seleccionado por el usuario
 * @param signal (opcional) AbortSignal para cancelar la petición
 */
export async function importCepas(
  file: File,
  signal?: AbortSignal
): Promise<ImportResult> {
  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await api.post<ImportResult>("/cepas/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      signal,
    });
    // Validación básica
    if (!res.data || typeof res.data.inserted !== "number") {
      throw new Error("Respuesta de importación inválida");
    }
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? "no-status";
      const msg =
        typeof error.response?.data === "string"
          ? error.response?.data
          : error.message;
      console.error(`[importCepas] AxiosError [${status}]:`, msg);
    } else {
      console.error("[importCepas] Error inesperado:", error);
    }
    throw error;
  }
}

/**
 * Helper opcional: aceptar arrastrar/soltar (Blob).
 */
export function importCepasFromBlob(
  blob: Blob,
  filename = "import.xlsx",
  signal?: AbortSignal
) {
  const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
  return importCepas(file, signal);
}
