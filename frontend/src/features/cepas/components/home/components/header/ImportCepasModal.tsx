import ImportCepas from '../../../ImportCepas'

type ImportCepasModalProps = {
    isOpen: boolean
    onClose: () => void
    existingNames: string[]
    onImported: () => void
}

export default function ImportCepasModal({
    isOpen,
    onClose,
    existingNames,
    onImported,
}: ImportCepasModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Contenedor */}
            <div className="relative z-10 w-full max-w-xl rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Importar Cepas desde Excel/CSV</h3>
                    <button
                        onClick={onClose}
                        className="rounded px-2 py-1 hover:bg-gray-700"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* key fuerza remount al abrir → resetea estado interno */}
                <ImportCepas
                    key={String(isOpen)}
                    existingNames={existingNames}
                    onImported={() => {
                        onImported()
                        onClose()
                    }}
                />
            </div>
        </div>
    )
}