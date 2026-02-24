// src/features/cepas/utils/cepaFile.ts
import type { ColDef } from "ag-grid-community";
import { downloadTextFile } from "./attributeFile";

/**
 * Construye el texto de la plantilla de cepa
 * usando los headerName de las columnas (excepto id).
 */
export function buildCepaTemplateText(columns: ColDef[]): string {
    const lines: string[] = [];

    columns
        .filter(
            (col): col is ColDef & { field: string } =>
                typeof col.field === "string" && col.field !== "id"
        )
        .forEach((col) => {
            const header = col.headerName ?? col.field;
            lines.push(`${header}=`);
        });

    return lines.join("\n");
}

/**
 * Descarga la plantilla de cepa como archivo .txt
 */
export function downloadCepaTemplate(columns: ColDef[]): void {
    const text = buildCepaTemplateText(columns);
    downloadTextFile("plantilla_cepa.txt", text);
}

/**
 * Parsea el contenido del archivo .txt de cepa
 * y devuelve un diccionario clave→valor donde la clave es el headerName.
 */
export function parseCepaFile(
    text: string,
    expectedKeys: string[]
): Record<string, string> {
    const maxLines = expectedKeys.length;
    const rawLines = text.split(/\r?\n/).slice(0, maxLines);

    const rawKeys = rawLines.map((line) =>
        line.includes("=") ? line.split("=")[0].trim() : line.trim()
    );

    const missingKeys = expectedKeys.filter((k) => !rawKeys.includes(k));
    if (missingKeys.length > 0) {
        throw new Error(
            `Faltan las siguientes claves en la plantilla: ${missingKeys.join(", ")}`
        );
    }

    const parsed: Record<string, string> = {};

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (!line.includes("=")) {
            throw new Error(
                `Formato inválido en línea ${i + 1}: falta el carácter '='`
            );
        }

        // NO USAR '=' EN LOS VALORES O CLAVES. SE ROMPE EL PARSEO
        const [rawKey, ...rest] = line.split("=");
        const key = rawKey.trim();
        const value = rest.join("=").trim();

        if (!key) {
            throw new Error(`Clave vacía en línea ${i + 1}`);
        }

        parsed[key] = value;
    }

    return parsed;
}

/**
 * Aplica reglas de dominio:
 * - "Cepa" no puede estar vacía
 * - el resto de claves vacías se rellenan con "N/I"
 */
export function normalizeCepaParsedData(
    parsed: Record<string, string>
): Record<string, string> {
    if (!parsed["Cepa"]?.trim()) {
        throw new Error('El valor de la clave "Cepa" no puede estar en blanco');
    }

    const normalized: Record<string, string> = { ...parsed };

    Object.keys(normalized).forEach((key) => {
        if (key !== "Cepa" && !normalized[key].trim()) {
            normalized[key] = "N/I";
        }
    });

    return normalized;
}
