// src/features/cepas/components/new-attribute/NewAttributeForm.tsx
import type React from "react";

type CepaLite = { id: number; nombre: string };

type NewAttributeFormProps = {
    cepas: CepaLite[];
    inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, index: number) => void;
    onSubmit: () => void;
};

export default function NewAttributeForm({
    cepas,
    inputRefs,
    onKeyDown,
    onSubmit,
}: NewAttributeFormProps) {
    return (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg max-h-[70vh] overflow-y-auto">
            {/* Nombre del atributo */}
            <div className="mb-4">
                <input
                    ref={(el) => {
                        inputRefs.current[0] = el;
                    }}
                    onKeyDown={(e) => onKeyDown(e, 0)}
                    type="text"
                    name="attribute_name"
                    placeholder="Nombre del atributo"
                    className="w-full p-2 border border-gray-300 rounded text-black"
                />
            </div>

            {/* Valores por cepa */}
            {cepas.map((cepa, idx) => (
                <div className="mb-4" key={cepa.id}>
                    <input
                        ref={(el) => {
                            inputRefs.current[idx + 1] = el;
                        }}
                        onKeyDown={(e) => onKeyDown(e, idx + 1)}
                        type="text"
                        name={cepa.nombre}
                        placeholder={cepa.nombre}
                        className="w-full p-2 border border-gray-300 rounded text-black"
                    />
                </div>
            ))}

            <div className="flex justify-end mt-6">
                <button
                    onClick={onSubmit}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Añadir atributo
                </button>
            </div>
        </div>
    );
}
