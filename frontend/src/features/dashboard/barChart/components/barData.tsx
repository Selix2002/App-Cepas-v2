// src/components/barChart/barData.tsx

/**
 * Estructura que Nivo Bar necesita:
 *  - data: [{ x: "Categoría X", SerieA: 3, SerieB: 1, ... }, ...]
 *  - keys: ["SerieA", "SerieB", ...]  // series (barras por grupo)
 *  - indexBy: "x"                      // clave para el eje X
 */

export type ColSel = { field: string; name: string };

export type BarChartResult = {
  data: Array<Record<string, number | string>>;
  keys: string[];
  indexBy: string; // normalmente "x"
};

/** Lee valores anidados usando rutas con puntos (p.ej. "morfologia.gram"). */
function getValueByPath(row: any, path: string): unknown {
  if (!row || !path) return undefined;
  return path.split(".").reduce((acc: any, key) => (acc ? acc[key] : undefined), row);
}

/** Normaliza cualquier valor a una etiqueta string amigable (incluye null/undefined). */
function toLabel(v: unknown): string {
  if (v === null || v === undefined) return "N/I"; // No informado
  const s = String(v).trim();
  return s.length ? s : "N/I";
}

/**
 * Construye el dataset para Nivo Bar cruzando dos columnas.
 * - La columna más antigua (firstCol) => eje X (grupos)
 * - La columna más nueva (secondCol)  => series (barras dentro de cada grupo)
 * - El valor (eje Y)                  => conteo de cepas
 */
export function processDataForBarChart(
  rows: any[],
  firstCol: ColSel,   // más antigua => X
  secondCol: ColSel   // más nueva  => series
): BarChartResult {
  // Mapa: xValue -> (serieValue -> conteo)
  const matrix = new Map<string, Map<string, number>>();
  const allSeries = new Set<string>();

  for (const r of rows ?? []) {
    const rawX = getValueByPath(r, firstCol.field);
    const rawS = getValueByPath(r, secondCol.field);
    const x = toLabel(rawX);
    const s = toLabel(rawS);

    allSeries.add(s);

    if (!matrix.has(x)) matrix.set(x, new Map<string, number>());
    const inner = matrix.get(x)!;
    inner.set(s, (inner.get(s) ?? 0) + 1);
  }

  // Ordenamos categorías X alfabéticamente para estabilidad visual
  const xValues = Array.from(matrix.keys()).sort((a, b) => a.localeCompare(b));

  // Orden de series: por frecuencia total (desc), luego alfabético
  const seriesTotals = new Map<string, number>();
  for (const [, bySerie] of matrix) {
    for (const [serie, cnt] of bySerie) {
      seriesTotals.set(serie, (seriesTotals.get(serie) ?? 0) + cnt);
    }
  }
  const keys = Array.from(allSeries).sort((a, b) => {
    const da = (seriesTotals.get(a) ?? 0);
    const db = (seriesTotals.get(b) ?? 0);
    return db - da || a.localeCompare(b);
  });

  // Armamos el arreglo data que Nivo espera
  const data = xValues.map((x) => {
    const bySerie = matrix.get(x)!;
    const row: Record<string, number | string> = { x };
    for (const k of keys) {
      row[k] = bySerie.get(k) ?? 0;
    }
    return row;
  });

  return {
    data,
    keys,
    indexBy: "x",
  };
}
