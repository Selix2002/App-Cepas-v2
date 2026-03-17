// src/features/cepas/components/home/CoordFilterChips.tsx
import type { CoordFilter } from "../../../../types/tableTypes";

type CoordFilterChipsProps = {
    coordFilter: CoordFilter | null;
    onClear: () => void;
};

export default function CoordFilterChips({
    coordFilter,
    onClear,
}: CoordFilterChipsProps) {
    if (!coordFilter) return null;

    return (
        <div className="px-4">
            <div className="flex items-center gap-3 mb-3">
                <span
                    className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-sm"
                    title="Filtro por coordenadas aplicado"
                >
                    Coordenadas filtradas:
                    <code className="text-blue-300">
                        [{coordFilter.lat.toFixed(6)}, {coordFilter.lng.toFixed(6)}]
                    </code>
                </span>

                <button
                    onClick={onClear}
                    className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-sm hover:bg-gray-700"
                >
                    Limpiar filtros
                </button>
            </div>
        </div>
    );
}
