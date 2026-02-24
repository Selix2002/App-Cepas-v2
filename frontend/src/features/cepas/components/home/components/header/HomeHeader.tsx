// src/features/cepas/components/home/HomeHeader.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreVertical } from 'lucide-react'
import type { Column } from 'ag-grid-community'
import DropdownMenu from '../../../../../../shared/components/DropdownMenu'

type HomeHeaderProps = {
    isAdmin: boolean
    columns: Column[]
    onLogout: () => void
    onOpenImport: () => void
    onExport: () => void
    onToggleColumnVisibility: (colId: string, visible: boolean) => void
}

export default function HomeHeader({
    isAdmin,
    columns,
    onLogout,
    onOpenImport,
    onExport,
    onToggleColumnVisibility,
}: HomeHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [adminMenuOpen, setAdminMenuOpen] = useState(false)

    return (
        <div className="relative h-16 flex items-center mt-8 justify-center px-4">
            {/* Botón + menú de creación (solo admin) */}
            <div className="absolute left-4">
                {isAdmin && (
                    <div className="relative">
                        <button onClick={() => setAdminMenuOpen(v => !v)}>
                            + Crear Nuevo
                        </button>
                        {adminMenuOpen && (
                            <div className="absolute top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                                <ul className="flex flex-col p-2">
                                    <li className="mb-1">
                                        <Link to="/home/addatribute">
                                            <button className="w-full text-left p-2 hover:bg-gray-700 rounded">
                                                Nuevo Atributo
                                            </button>
                                        </Link>
                                    </li>
                                    <li className="mb-1">
                                        <Link to="/home/addcepa">
                                            <button className="w-full text-left p-2 hover:bg-gray-700 rounded">
                                                Nueva Cepa
                                            </button>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/home/UserManagement">
                                            <button className="w-full text-left p-2 hover:bg-gray-700 rounded">
                                                Nuevo Usuario
                                            </button>
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Zona derecha: logout / importar / exportar / menú columnas */}
            <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex space-x-2">
                <button className="logout" onClick={onLogout}>
                    Cerrar Sesión
                </button>
                {isAdmin && (
                    <button className="import" onClick={onOpenImport}>
                        Importar
                    </button>
                )}
                {isAdmin && <button onClick={onExport}>Exportar</button>}
                <button onClick={() => setMenuOpen(v => !v)}>
                    <MoreVertical className="h-6 w-6 text-white" />
                </button>
            </div>

            {/* Menú de columnas */}
            <DropdownMenu
                isOpen={menuOpen}
                columns={columns}
                onToggle={onToggleColumnVisibility}
                onClose={() => setMenuOpen(true)}
            />

            {/* Título centrado */}
            <span className="text-xl font-medium">
                Dashboard para Gestión de Cepas Bacterianas
            </span>
        </div>
    )
}
