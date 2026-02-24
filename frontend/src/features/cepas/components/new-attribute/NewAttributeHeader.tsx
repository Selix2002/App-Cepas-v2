// src/features/cepas/components/new-attribute/NewAttributeHeader.tsx
import { Link } from "react-router-dom";
import type React from "react";

type NewAttributeHeaderProps = {
    onDownloadTemplate: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function NewAttributeHeader({
    onDownloadTemplate,
    fileInputRef,
    onFileChange,
}: NewAttributeHeaderProps) {
    return (
        <header className="fixed top-0 left-0 w-full bg-[#213547] p-8 z-10">
            {/* Botón volver */}
            <div className="absolute top-4 left-4">
                <Link to="/home">
                    <button className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded">
                        ← Volver
                    </button>
                </Link>
            </div>

            {/* Botones derecha: descargar / subir */}
            <div className="absolute top-4 right-4 flex space-x-2">
                <button
                    onClick={onDownloadTemplate}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Descargar plantilla
                </button>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Subir archivo
                </button>

                <input
                    type="file"
                    accept=".txt"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    style={{ display: "none" }}
                />
            </div>
        </header>
    );
}
