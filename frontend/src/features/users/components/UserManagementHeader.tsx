import { Link } from "react-router-dom"

interface UserManagementHeaderProps {
    onAddUser: () => void
}

export default function UserManagementHeader({ onAddUser }: UserManagementHeaderProps) {
    return (
        <div className="flex-none shadow p-6 relative bg-gray-900 flex justify-start items-center">
            <div className="flex items-center gap-4">
                <Link
                    to="/home"
                    className="text-white hover:bg-gray-700 p-2 rounded"
                >
                    ← Volver
                </Link>
                <button
                    onClick={onAddUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    + Añadir Usuario
                </button>
            </div>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-4xl font-bold">
                Gestión de Usuarios
            </h1>
        </div>
    )
}