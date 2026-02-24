// src/features/cepas/utils/attributeFile.ts

// Construye el contenido de la plantilla .txt
export function buildTemplateText(cepas: { nombre: string }[]): string {
    const lines = ["attribute_name="];
    cepas.forEach((cepa) => lines.push(`${cepa.nombre}=`));
    return lines.join("\n");
}

// Descarga un archivo de texto en el navegador
export function downloadTextFile(filename: string, text: string): void {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Parsea el contenido del .txt a un diccionario clave→valor
export function parseAttributeFile(text: string): Record<string, string> {
    const lines = text.split(/\r?\n/);
    const dict: Record<string, string> = {};

    lines.forEach((line, idx) => {
        if (!line.trim()) return; // saltar líneas vacías

        if (!line.includes("=")) {
            throw new Error(`Formato inválido en línea ${idx + 1}: falta '='`);
        }

        const [rawKey, ...rest] = line.split("=");
        const key = rawKey.trim();
        const valueRaw = rest.join("=").trim();

        dict[key] = valueRaw === "" ? "N/I" : valueRaw;
    });

    return dict;
}

// Valida que el dict tenga las claves correctas y un attribute_name válido
export function validateAttributeDict(
    dict: Record<string, string>,
    cepaNames: string[]
): void {
    const expectedKeys = ["attribute_name", ...cepaNames];

    const missing = expectedKeys.filter((k) => !(k in dict));
    if (missing.length > 0) {
        throw new Error(`Faltan las siguientes claves: ${missing.join(", ")}`);
    }

    const extra = Object.keys(dict).filter((k) => !expectedKeys.includes(k));
    if (extra.length > 0) {
        throw new Error(`Claves no esperadas: ${extra.join(", ")}`);
    }

    if (!dict["attribute_name"] || dict["attribute_name"] === "N/I") {
        throw new Error('Debe ingresar un valor válido para "attribute_name"');
    }
}
