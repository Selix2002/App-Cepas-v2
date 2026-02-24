// src/features/cepas/components/new-cepa/NewCepaHeader.tsx
import { Link } from "react-router-dom";
import type React from "react";

type NewCepaHeaderProps = {
    onDownloadTemplate: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function NewCepaHeader({
    onDownloadTemplate,
    fileInputRef,
    onFileChange,
}: NewCepaHeaderProps) {
    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
            {/* Botón Volver */}
            <div>
                <Link to="/home">
                    <button className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded">
                        Volver
                    </button>
                </Link>
            </div>

            {/* Título */}
            <h1 className="text-2xl font-bold">Agregar Nueva Cepa</h1>

            {/* Acciones derecha */}
            <div className="space-x-2">
                <button
                    onClick={onDownloadTemplate}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Descargar Plantilla
                </button>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Subir Archivo
                </button>

                <input
                    type="file"
                    accept=".txt"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={onFileChange}
                />
            </div>
        </header>
    );
}
