// src/components/pieChart/PieData.tsx

import type { PieDataItem } from "../../../../shared/interfaces/index_charts";

// La función de generar color no necesita cambios
const PREDEFINED_COLORS: string[] = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5",
  "#c49c94", "#f7b6d2", "#c7c7c7", "#dbdb8d", "#9edae5",
  "#393b79", "#637939", "#8c6d31", "#843c39", "#7b4173"
];

// La función de generación dinámica ahora es un 'fallback'
const generateHSLColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  const GOLDEN_ANGLE = 137.508;
  const h = (hash * GOLDEN_ANGLE) % 360;
  const hue = ((h % 360) + 360) % 360;
  const saturation = 60 + (hash % 11) * 2;
  const lightness = 45 + (hash % 11);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// La función para obtener valores anidados tampoco necesita cambios
// --- MODIFICACIÓN: La función ahora espera un objeto y extrae el 'field' ---
const getValueByPath = (obj: any, path: { field: string }): any => {

  // 1. Comprobamos si el path o su propiedad .field existen antes de usarlos.
  if (!path?.field || typeof path.field !== 'string') {
    return undefined;
  }
  console.log("getValueByPath called with path:", path.field);
  // 2. Usamos path.field para navegar por el objeto.
  return path.field
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj
    );
};

/**
 * Procesa un array de datos crudos para contar las ocurrencias de valores en una columna específica,
 * siendo insensible a mayúsculas y minúsculas.
 */
export const processDataForPieChart = (
  rawData: any[],
  column: { field: string; name: string }
): PieDataItem[] => {
  // Comprobación inicial para el objeto y su propiedad 'field'.
  if (!rawData || rawData.length === 0 || !column?.field) {
    return [];
  }

  // Objeto para almacenar la cuenta de cada valor (usando claves en minúsculas).
  const counts: { [key: string]: number } = {};

  // MODIFICACIÓN: Objeto para guardar la primera capitalización encontrada para cada clave.
  // Ej: { "bacilos": "Bacilos" }
  const originalCaseMap: { [key: string]: string } = {};

  // Itera sobre cada fila de los datos crudos.
  for (const row of rawData) {
    const originalValue = getValueByPath(row, column) ?? "No especificado";

    // Aseguramos que el valor sea un string antes de usar métodos de string.
    const valueAsString = String(originalValue);

    // MODIFICACIÓN: Se crea una clave en minúsculas para la agrupación.
    const lowerCaseKey = valueAsString.toLowerCase();

    // Si es la primera vez que vemos esta clave, guardamos su formato original.
    if (!originalCaseMap[lowerCaseKey]) {
      originalCaseMap[lowerCaseKey] = valueAsString;
    }

    // Incrementa el contador usando siempre la clave en minúsculas.
    counts[lowerCaseKey] = (counts[lowerCaseKey] || 0) + 1;
  }
  const colorMap: { [key: string]: string } = {};
  const uniqueLabels = Object.values(originalCaseMap);
    uniqueLabels.forEach((label, index) => {
    if (index < PREDEFINED_COLORS.length) {
      // Si estamos dentro del límite de la paleta, usamos un color predefinido.
      colorMap[label] = PREDEFINED_COLORS[index];
    } else {
      // Si se agota la paleta, generamos un color dinámicamente.
      colorMap[label] = generateHSLColorFromString(label);
    }
  });

  // Transforma el objeto de cuentas al formato que Nivo requiere.
  const pieData: PieDataItem[] = Object.entries(counts).map(
    ([lowerCaseKey, count]) => {
      // MODIFICACIÓN: Usamos la capitalización original que guardamos como etiqueta.
      const originalLabel = originalCaseMap[lowerCaseKey];

      return {
        id: originalLabel,
        label: originalLabel,
        value: count,
        // Generamos el color a partir de la etiqueta original para consistencia.
        color: colorMap[originalLabel],
      };
    }
  );

  return pieData;
};
