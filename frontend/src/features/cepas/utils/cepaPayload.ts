// src/features/cepas/utils/cepaPayload.ts
import type { CepaColumnDef } from "../types/tableTypes";

const RELATIONS = [
    "almacenamiento",
    "medio_cultivo",
    "morfologia",
    "actividad_enzimatica",
    "crecimiento_temperatura",
    "resistencia_antibiotica",
    "caracterizacion_genetica",
    "proyecto",
];

export type CepaPayload = Record<string, any>;

export function createBaseCepaPayload(): CepaPayload {
    return {
        nombre: null,
        cod_lab: null,
        origen: null,
        latitud: null,
        longitud: null,
        pigmentacion: null,
        almacenamiento: {},
        medio_cultivo: {},
        morfologia: {},
        actividad_enzimatica: {},
        crecimiento_temperatura: {},
        resistencia_antibiotica: {},
        caracterizacion_genetica: {},
        proyecto: {},
        datos_extra: {},
    };
}

/**
 * Aplica un valor a un payload dado un path tipo "campo" o "parent.child".
 * Si el parent es una relación conocida, lo anida ahí.
 * Si es "datos_extra", lo trata como tal.
 * Si no, cae en datos_extra con la key original.
 */
function assignToPayload(
    payload: CepaPayload,
    fieldPath: string,
    value: any
): void {
    if (fieldPath.includes(".")) {
        const [parent, child] = fieldPath.split(".");

        if (RELATIONS.includes(parent)) {
            payload[parent] = payload[parent] || {};
            payload[parent][child] = value;
        } else if (parent === "datos_extra") {
            payload.datos_extra = payload.datos_extra || {};
            payload.datos_extra[child] = value;
        } else {
            // parent inesperado → lo mandamos completo a datos_extra
            payload.datos_extra = payload.datos_extra || {};
            payload.datos_extra[fieldPath] = value;
        }
    } else {
        // campo plano
        payload[fieldPath] = value;
    }
}

/**
 * Construye el payload a partir de un diccionario
 * donde las keys son *fieldPath* (lo que ya viene en col.field).
 * Se usa para el flujo manual (formulario).
 */
export function buildCepaPayloadFromFieldMap(
    flatByField: Record<string, string>
): CepaPayload {
    const payload: CepaPayload = {}

    for (const [fieldPath, rawValue] of Object.entries(flatByField)) {
        const value = rawValue.trim() === "" ? "N/I" : rawValue;
        assignToPayload(payload, fieldPath, value);
    }

    if (payload.datos_extra && !Object.keys(payload.datos_extra).length) {
        delete payload.datos_extra;
    }

    return payload;
}

/**
 * Construye el payload a partir de un diccionario
 * donde las keys son *headerName* (lo que usas en la plantilla .txt).
 * Se usa para el flujo de archivo + modal.
 */
export function buildCepaPayloadFromHeaderMap(
    flatByHeader: Record<string, string>,
    columns: CepaColumnDef[]
): CepaPayload {
    const payload = createBaseCepaPayload();

    const headerToField = columns
        .filter(
            (col): col is CepaColumnDef & { field: string } =>
                typeof col.field === "string" && col.field !== "id"
        )
        .reduce<Record<string, string>>((acc, col) => {
            if (col.headerName) acc[col.headerName] = col.field;
            return acc;
        }, {});

    for (const [headerName, rawValue] of Object.entries(flatByHeader)) {
        const val = rawValue === "" ? null : rawValue;
        const fieldPath = headerToField[headerName];

        if (!fieldPath) {
            // sin mapeo → lo mandamos a datos_extra si tiene valor
            if (val != null) {
                payload.datos_extra[headerName] = val;
            }
            continue;
        }

        assignToPayload(payload, fieldPath, val);
    }

    // Elimina objetos anidados completamente vacíos (todos null)
    for (const key of Object.keys(payload)) {
        const val = payload[key];
        if (
            val &&
            typeof val === "object" &&
            !Array.isArray(val) &&
            Object.values(val).every((v) => v == null)
        ) {
            delete payload[key];
        }
    }

    try {
        if (!Object.keys(payload.datos_extra).length) {
            delete payload.datos_extra;
        }
    } catch {
        // datos_extra no existe o no es objeto, ignoramos
    }

    return payload;
}
