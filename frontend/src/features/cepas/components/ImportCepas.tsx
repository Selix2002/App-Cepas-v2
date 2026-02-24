// src/features/cepas/components/ImportCepas.tsx
import { useState } from "react";
import Papa from "papaparse";
import ExcelJS from "exceljs";   // 👈 nuevo import
import { importCepas } from "../services/CepasQuery";

type ImportResult = {
  inserted: number;
  updated: number;
  errors: { row_index: number; error: string }[];
  warnings: string[];
};

type Props = {
  existingNames: string[];
  onImported?: () => void;
};



const normalize = (s: string) =>
  s.normalize("NFC").trim().toLowerCase();

export default function ImportCepas({ existingNames, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<string[] | null>(null);
  const [userConfirmedOverwrite, setUserConfirmedOverwrite] = useState(false);

  
  // 🔄 Nuevo parser que soporta CSV y Excel
  const parseFileForNames = (f: File): Promise<string[]> =>
    new Promise((resolve, reject) => {
      const keys = ["nombre", "Cepa", "nombre_cepa", "NombreCepa"];
      const getName = (row: Record<string, any>) => {
        const k = keys.find((kk) => kk in row);
        return k ? String(row[k]).trim() : "";
      };

      const ext = (f.name.split(".").pop() ?? "").toLowerCase();
      const isExcel = ["xlsx", "xls"].includes(ext);

      if (!isExcel) {
        // CSV con PapaParse
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (res) => {
            const rows = (res.data as any[]) ?? [];
            resolve(rows.map(getName).filter(Boolean));
          },
          error: (err) => reject(err),
        });
        return;
      }

      // Excel con ExcelJS
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const sheet = workbook.worksheets[0];
          if (!sheet) {
            reject(new Error("No se encontró ninguna hoja en el Excel"));
            return;
          }

          // Encabezados en la primera fila
          const headerRow = sheet.getRow(1);
          const headers: string[] = Array.isArray(headerRow.values)
            ? headerRow.values.slice(1).map((h: any) => String(h ?? "").trim())
            : [];

          const rows: Record<string, any>[] = [];
          sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // saltar encabezados
            const obj: Record<string, any> = {};
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber - 1] ?? `col${colNumber}`;
              obj[header] = cell.value?.toString() ?? "";
            });
            console.log("Parsed row:", obj);
            rows.push(obj);
          });

          resolve(rows.map(getName).filter(Boolean));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (e) =>
        reject((e as any)?.message ?? "Error leyendo el archivo Excel");
      reader.readAsArrayBuffer(f);
    });

  const handlePrecheck = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setDuplicates(null);
    setUserConfirmedOverwrite(false);
    try {
      const namesFromFile = await parseFileForNames(file);
      if (namesFromFile.length === 0) {
        setError(
          "No se encontraron nombres de cepas (encabezados esperados: nombre / Cepa / nombre_cepa / NombreCepa)."
        );
        return;
      }
      const existingSet = new Set(existingNames.map(normalize));
      const dups = namesFromFile.filter((n) => existingSet.has(normalize(n)));
      if (dups.length > 0) {
        setDuplicates([...new Set(dups)]);
        return;
      }
      await doImport();
    } catch (e: any) {
      setError(e?.message ?? "Error al procesar el archivo");
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await importCepas(file);
      setResult(data);
      setDuplicates(null);
      setUserConfirmedOverwrite(false);
      onImported?.();
    } catch (e: any) {
      setError(e?.message ?? "Error al importar");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndImport = async () => {
    if (!userConfirmedOverwrite) {
      setError("Debes confirmar que aceptas modificar las cepas listadas.");
      return;
    }
    await doImport();
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-white hover:file:bg-blue-700"
      />

      {!duplicates && (
        <button
          onClick={handlePrecheck}
          disabled={!file || loading}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Revisando..." : "Comprobar e Importar"}
        </button>
      )}

      {duplicates && (
        <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3">
          <h4 className="font-semibold text-yellow-300">
            Atención: nombres ya existentes
          </h4>
          <p className="text-sm text-yellow-200">
            Estas cepas ya existen y serán <b>modificadas</b> si continúas:
          </p>
          <ul className="ml-5 list-disc text-sm">
            {duplicates.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={userConfirmedOverwrite}
              onChange={(e) =>
                setUserConfirmedOverwrite(e.target.checked)
              }
            />
            Confirmo que deseo sobrescribir/actualizar estas cepas.
          </label>

          <div className="mt-3 flex gap-2">
            <button
              onClick={handleConfirmAndImport}
              disabled={loading || !userConfirmedOverwrite}
              className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Importando..." : "Confirmar y continuar"}
            </button>
            <button
              onClick={() => {
                setDuplicates(null);
                setUserConfirmedOverwrite(false);
              }}
              className="rounded bg-gray-700 px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-red-400">{error}</p>}

      {result && (
        <div className="mt-4">
          <p>Actualizados: {result.inserted}</p>
          <p>Insertados: {result.updated}</p>
          {result.errors.length > 0 && (
            <>
              <h4 className="mt-2 font-semibold">Errores:</h4>
              <ul className="list-disc ml-5 text-red-300">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Fila {e.row_index}: {e.error}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
