// src/features/cepas/components/home/components/header/ImportCepasModal.tsx
import { useEffect, useState } from "react"
import ImportCepas from "../../../ImportCepas"
import "../../../import-modal.css"

type Props = {
    isOpen: boolean
    onClose: () => void
    existingNames: string[]
    onImported: () => void
}

export default function ImportCepasModal({ isOpen, onClose, existingNames, onImported }: Props) {
    const [isImporting, setIsImporting] = useState(false)

    // ESC para cerrar (bloqueado mientras hay un import en curso)
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !isImporting) onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [isOpen, isImporting, onClose])

    if (!isOpen) return null

    const handleClose = () => { if (!isImporting) onClose() }

    return (
        <div className="im-overlay">
            <div className="im-backdrop" onClick={handleClose} />

            <div className="im-card">
                <div className="im-accent-line" />

                <div className="im-header">
                    <div className="im-header-left">
                        <span className="im-hex">⬡</span>
                        <span className="im-title">Importar Cepas</span>
                        <span className="im-subtitle">— Excel / CSV</span>
                    </div>
                    <button className="im-close" onClick={handleClose} disabled={isImporting} aria-label="Cerrar">
                        ✕
                    </button>
                </div>

                <div className="im-body">
                    {/* key fuerza remount al abrir → resetea estado interno */}
                    <ImportCepas
                        key={String(isOpen)}
                        existingNames={existingNames}
                        onImportingChange={setIsImporting}
                        onImported={() => {
                            onImported()
                            onClose()
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
