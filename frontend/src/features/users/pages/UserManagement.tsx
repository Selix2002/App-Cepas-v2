// src/features/users/pages/UserManagement.tsx
import { useRef } from "react";
import UserTable, { type UserTableHandles } from "../components/UserTable";
import UserManagementHeader from "../components/UserManagementHeader";

export default function UserPage() {
  const userTableRef = useRef<UserTableHandles>(null);

  const handleAddUser = () => {
    userTableRef.current?.onAddUser();
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-900 text-white">
      {/* HEADER */}
      <UserManagementHeader onAddUser={handleAddUser} />

      {/* CONTENIDO: tabla / ag-Grid */}
      <div className="flex-1 border-t border-gray-700 p-4 box-border">
        <UserTable ref={userTableRef} />
      </div>
    </div>
  );
}
