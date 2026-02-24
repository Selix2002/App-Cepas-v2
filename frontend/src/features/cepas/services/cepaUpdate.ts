// src/utils/cepaUpdate.ts

import { updateCepa } from "./CepasQuery";

/**
 * Construye el objeto payload para un solo campo anidado o no,
 * ejecuta updateCepa y devuelve la promesa.
 *
 * @param id         El ID de la cepa que se va a actualizar.
 * @param fieldPath  Nombre “punto­-notación” del campo (ej. "nombre", "morfologia.gram", etc.).
 * @param newValue   El nuevo valor para ese campo.
 * @returns          Una promesa que resuelve cuando termina la llamada a updateCepa.
 */
export async function actualizarCepaPorCampo(
  id: number,
  fieldPath: string,
  newValue: any
): Promise<void> {
  // 1) Si no cambió, salir rápido (opcional)
  //    Podemos dejar esta parte en el componente si queremos que el util sea más genérico.

  // 2) Construir el payload (un objeto con el campo anidado)
  const pathSegments = fieldPath.split(".");
  let payload: Record<string, any> = {};

  if (pathSegments.length === 1) {
    // Caso sencillo: { campo: newValue }
    payload[pathSegments[0]] = newValue;
  } else {
    // Campos anidados: { nivel1: { nivel2: { ... } } }
    let cursor = payload;
    for (let i = 0; i < pathSegments.length - 1; i++) {
      const seg = pathSegments[i];
      cursor[seg] = {};
      cursor = cursor[seg];
    }
    cursor[pathSegments[pathSegments.length - 1]] = newValue;
  }

  // 3) Llamar al servicio que hace el PUT/POST a backend
  await updateCepa(id, payload);
}
