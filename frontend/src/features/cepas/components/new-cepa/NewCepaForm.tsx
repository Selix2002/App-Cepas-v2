// src/features/cepas/components/new-cepa/NewCepaForm.tsx
import type React from "react";
import type { ColDef } from "ag-grid-community";

type NewCepaFormProps = {
    columns: ColDef[];
    formData: Record<string, string>;
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onFieldChange: (field: string, value: string) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
    onAddCepa: () => void;
};

export default function NewCepaForm({
    columns,
    formData,
    inputRefs,
    onFieldChange,
    onKeyDown,
    onAddCepa,
}: NewCepaFormProps) {
    const editableColumns = columns.filter(
        (col): col is ColDef & { field: string } =>
            typeof col.field === "string" && col.field !== "id"
    );

    return (
        <form
            className="space-y-4 max-w-xl mx-auto"
            // Evitamos submit por Enter global; manejamos Enter a mano
            onSubmit={(e) => e.preventDefault()}
        >
            {editableColumns.map((col, idx) => {
                const field = col.field;
                const label = col.headerName ?? field;
                const isLat = field === "latitud";
                const isLng = field === "longitud";

                return (
                    <div key={field} className="flex flex-col">
                        <label htmlFor={field} className="mb-1 capitalize">
                            {label}
                        </label>
                        <input
                            id={field}
                            name={field}
                            type={isLat || isLng ? "number" : "text"}
                            inputMode={isLat || isLng ? "decimal" : undefined}
                            step={isLat || isLng ? "any" : undefined}
                            min={isLat ? -90 : isLng ? -180 : undefined}
                            max={isLat ? 90 : isLng ? 180 : undefined}
                            value={formData[field] || ""}
                            ref={(el) => {
                                inputRefs.current[idx] = el;
                            }}
                            onChange={(e) => onFieldChange(field, e.target.value)}
                            onKeyDown={(e) => onKeyDown(e, idx)}
                            className="bg-gray-800 text-white p-2 rounded border border-gray-700"
                        />
                    </div>
                );
            })}

            <button
                type="button"
                className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded"
                onClick={onAddCepa}
            >
                Añadir Cepa
            </button>
        </form>
    );
}
