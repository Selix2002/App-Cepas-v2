// src/features/users/components/UserManagementHeader.tsx
import { Link } from "react-router-dom";

interface UserManagementHeaderProps {
    onAddUser: () => void;
}

export default function UserManagementHeader({ onAddUser }: UserManagementHeaderProps) {
    return (
        <div className="flex-none shadow p-6 relative bg-gray-900 flex justify-start items-center">
            {/* BOTONES A LA IZQUIERDA */}
            <div className="flex items-center gap-4">
                <Link to="/home">
                    <button className="text-white hover:bg-gray-700 p-2 rounded">
                        ← Volver
                    </button>
                </Link>

                <button
                    onClick={onAddUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    + Añadir Usuario
                </button>
            </div>

            {/* TÍTULO CENTRADO */}
            <h1 className="absolute left-1/2 -translate-x-1/2 text-4xl font-bold">
                Gestión de Usuarios
            </h1>
        </div>
    );
}
