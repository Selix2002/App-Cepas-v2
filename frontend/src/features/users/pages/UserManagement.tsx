// src/features/users/pages/UserManagement.tsx
import { useRef, useState } from "react"
import UserTable, { type UserTableHandles } from "../components/UserTable"
import UserManagementHeader from "../components/UserManagementHeader"
import NewUser from "../components/new-user/NewUser"
import type { User } from "../../../shared/interfaces"
import "./user-management.css"

export default function UserPage() {
  const tableRef = useRef<UserTableHandles>(null)
  const [showNewUser, setShowNewUser] = useState(false)

  const handleUserCreated = (user: User) => {
    tableRef.current?.addUser(user)
    setShowNewUser(false)
  }

  return (
    <div className="um-page">
      <UserManagementHeader onAddUser={() => setShowNewUser(true)} />
      <div className="um-content">
        <UserTable ref={tableRef} />
      </div>
      <NewUser
        visible={showNewUser}
        onCreated={handleUserCreated}
        onCancel={() => setShowNewUser(false)}
      />
    </div>
  )
}
