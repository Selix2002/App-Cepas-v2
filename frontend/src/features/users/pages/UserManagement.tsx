// src/features/users/pages/UserManagement.tsx
import { useRef } from "react"
import UserTable, { type UserTableHandles } from "../components/UserTable"
import UserManagementHeader from "../components/UserManagementHeader"

export default function UserPage() {
  const userTableRef = useRef<UserTableHandles>(null)

  const handleAddUser = () => {
    userTableRef.current?.onAddUser()
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#070c16",
        overflow: "hidden",
      }}
    >
      <UserManagementHeader onAddUser={handleAddUser} />
      <div style={{ flex: 1, overflow: "hidden" }}>
        <UserTable ref={userTableRef} />
      </div>
    </div>
  )
}
