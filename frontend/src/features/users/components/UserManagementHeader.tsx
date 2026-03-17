// src/features/users/components/UserManagementHeader.tsx
import { Link } from "react-router-dom"

interface Props {
    onAddUser: () => void
}

export default function UserManagementHeader({ onAddUser }: Props) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px",
                height: 52,
                background: "#0b1220",
                borderBottom: "1px solid #1a2f28",
                flexShrink: 0,
                fontFamily: "'Courier New', monospace",
            }}
        >
            {/* left: back + add */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Link
                    to="/home"
                    style={{
                        color: "#8ab0a0",
                        fontSize: 11,
                        letterSpacing: 1,
                        textDecoration: "none",
                        border: "1px solid #1a2f28",
                        borderRadius: 4,
                        padding: "4px 12px",
                    }}
                >
                    ← Volver
                </Link>
                <button
                    onClick={onAddUser}
                    style={{
                        background: "#00e5b4",
                        color: "#070c16",
                        border: "none",
                        borderRadius: 4,
                        padding: "5px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: 0.5,
                    }}
                >
                    + Añadir Usuario
                </button>
            </div>

            {/* center: title */}
            <span
                style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#00e5b4",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                }}
            >
                Gestión de Usuarios
            </span>

            {/* right: logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#00e5b4", fontSize: 16 }}>⬡</span>
                <span style={{ fontSize: 12, color: "#3a6a5a", letterSpacing: 1 }}>CEPADB</span>
            </div>
        </div>
    )
}
