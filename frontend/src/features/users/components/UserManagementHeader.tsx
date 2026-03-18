// src/features/users/components/UserManagementHeader.tsx
import { Link } from "react-router-dom"
import "./user-management-header.css"

interface Props {
    onAddUser: () => void
}

export default function UserManagementHeader({ onAddUser }: Props) {
    return (
        <div className="umh-topbar">
            <div className="umh-left">
                <Link to="/home" className="umh-back-link">← Volver</Link>
                <button className="umh-add-btn" onClick={onAddUser}>
                    + Añadir Usuario
                </button>
            </div>

            <span className="umh-title">Gestión de Usuarios</span>

            <div className="umh-logo">
                <span className="umh-logo-hex">⬡</span>
                <span className="umh-logo-text">CEPADB</span>
            </div>
        </div>
    )
}
