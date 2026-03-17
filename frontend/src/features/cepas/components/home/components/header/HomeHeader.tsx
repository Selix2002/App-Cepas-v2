import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'
import type { CepaColumnDef } from '../../../../types/tableTypes'
import DropdownMenu from '../../../../../../shared/components/DropdownMenu'

type HomeHeaderProps = {
    isAdmin: boolean
    columns: CepaColumnDef[]
    hiddenFields: Set<string>
    onLogout: () => void
    onOpenImport: () => void
    onExport: () => void
    onToggleColumnVisibility: (colId: string, visible: boolean) => void
}

export default function HomeHeader({
    isAdmin,
    columns,
    hiddenFields,
    onLogout,
    onOpenImport,
    onExport,
    onToggleColumnVisibility,
}: HomeHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [adminMenuOpen, setAdminMenuOpen] = useState(false)
    const adminMenuRef = useRef<HTMLDivElement>(null)

    // Cierra el menú admin al hacer click afuera
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
                setAdminMenuOpen(false)
            }
        }
        if (adminMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [adminMenuOpen])

    return (
        <div className="relative h-16 flex items-center mt-8 justify-center px-4">

            {/* Botón + menú de creación (solo admin) */}
            {isAdmin && (
                <div className="absolute left-4" ref={adminMenuRef}>
                    <button onClick={() => setAdminMenuOpen(v => !v)}>
                        + Crear Nuevo
                    </button>
                    {adminMenuOpen && (
                        <div className="absolute top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                            <ul className="flex flex-col p-2">
                                <li className="mb-1">
                                    <Link
                                        to="/home/addatribute"
                                        className="block w-full text-left p-2 hover:bg-gray-700 rounded"
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Nuevo Atributo
                                    </Link>
                                </li>
                                <li className="mb-1">
                                    <Link
                                        to="/home/addcepa"
                                        className="block w-full text-left p-2 hover:bg-gray-700 rounded"
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Nueva Cepa
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        to="/home/UserManagement"
                                        className="block w-full text-left p-2 hover:bg-gray-700 rounded"
                                        onClick={() => setAdminMenuOpen(false)}
                                    >
                                        Nuevo Usuario
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Título centrado */}
            <span className="text-xl font-medium">
                Dashboard para Gestión de Cepas Bacterianas
            </span>

            {/* Zona derecha */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 flex space-x-2">
                <button className="logout" onClick={onLogout}>
                    Cerrar Sesión
                </button>
                {isAdmin && (
                    <button className="import" onClick={onOpenImport}>
                        Importar
                    </button>
                )}
                {isAdmin && (
                    <button onClick={onExport}>
                        Exportar
                    </button>
                )}
                <button onClick={() => setMenuOpen(v => !v)}>
                    <MoreVertical className="h-6 w-6 text-white" />
                </button>
            </div>

            {/* Menú de columnas */}
            <DropdownMenu
                isOpen={menuOpen}
                columns={columns}
                hiddenFields={hiddenFields}
                onToggle={onToggleColumnVisibility}
                onClose={() => setMenuOpen(false)}
            />
        </div>
    )
}