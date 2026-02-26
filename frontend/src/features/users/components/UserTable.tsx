import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { AgGridReact } from "ag-grid-react"
import type {
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  ICellRendererParams,
  GetRowIdParams,
} from "ag-grid-community"
import { getUsers, createUser, updateUser, deleteUser } from "../services/UsersQuery"
import type { User } from "../../../shared/interfaces"
import { useAuth } from "../../auth/store/AuthContext"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"

export interface UserTableHandles {
  onAddUser: () => Promise<void>
}

const UserTable = forwardRef<UserTableHandles>((_, ref) => {
  const { user: currentUser } = useAuth()
  const [gridApi, setGridApi] = useState<GridApi | null>(null)
  const [rowData, setRowData] = useState<User[]>([])

  useEffect(() => {
    if (gridApi) loadUsers()
  }, [gridApi])

  const loadUsers = async () => {
    try {
      const { items } = await getUsers()   // getUsers() retorna UserList
      setRowData(items)
    } catch (err) {
      console.error("Error cargando usuarios:", err)
    }
  }

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api)
  }

  const onAddUser = async () => {
    if (!gridApi) return
    const username = window.prompt("Nombre de usuario:")
    if (!username?.trim()) return
    const pwd = window.prompt("Contraseña (mínimo 8 caracteres):")
    if (!pwd) return

    try {
      const nuevo = await createUser({ username: username.trim(), password: pwd, is_admin: false })
      gridApi.applyTransaction({ add: [nuevo] })
      setRowData((prev) => [...prev, nuevo])
    } catch (err) {
      console.error("Error creando usuario:", err)
      window.alert("No se pudo crear el usuario.")
    }
  }

  useImperativeHandle(ref, () => ({ onAddUser }))

  const onCellValueChanged = async (event: CellValueChangedEvent) => {
    if (event.data.id === currentUser?.id) {
      event.node.setDataValue(event.colDef.field!, event.oldValue)
      return
    }

    const field = event.colDef.field
    const user = event.data as User

    if (field === "username") {
      const isDuplicate = rowData.some(
        (row) => row.username === event.newValue && row.id !== user.id
      )
      if (isDuplicate) {
        window.alert(`El nombre "${event.newValue}" ya existe. Elige otro.`)
        event.node.setDataValue(field, event.oldValue)
        return
      }
    }

    try {
      if (field === "username" || field === "is_admin") {
        await updateUser(user.id, { username: user.username, is_admin: user.is_admin })
      }
    } catch (err) {
      console.error("Error guardando cambio:", err)
      event.node.setDataValue(field!, event.oldValue)
    }
  }

  const onDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) return
    if (!window.confirm(`¿Eliminar al usuario "${user.username}"?`)) return
    try {
      await deleteUser(user.id)
      setRowData((prev) => prev.filter((r) => r.id !== user.id))
      gridApi?.applyTransaction({ remove: [user] })
    } catch (err) {
      console.error("Error eliminando usuario:", err)
    }
  }

  const columnDefs = [
    {
      field: "id",
      headerName: "ID",
      editable: false,
      width: 220,           // ObjectId es largo
      sort: "asc" as const,
    },
    {
      field: "username",
      headerName: "Usuario",
      flex: 1,
      editable: (params: { data: User }) => params.data.id !== currentUser?.id,
    },
    {
      field: "is_admin",            // era "isAdmin"
      headerName: "Administrador",
      editable: (params: { data: User }) => params.data.id !== currentUser?.id,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: [true, false] },
      valueFormatter: (p: { value: boolean }) => (p.value ? "Sí" : "No"),
      cellStyle: { display: "flex", justifyContent: "center" },
    },
    {
      headerName: "Eliminar",
      cellRenderer: (params: ICellRendererParams<User>) => {
        const isSelf = params.data?.id === currentUser?.id
        return (
          <button
            onClick={() => !isSelf && params.data && onDeleteUser(params.data)}
            disabled={isSelf}
            title={isSelf ? "No puedes eliminarte a ti mismo" : "Eliminar usuario"}
            className={isSelf ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          >
            {isSelf ? "🚫" : "🗑️"}
          </button>
        )
      },
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellStyle: { display: "flex", justifyContent: "center", alignItems: "center" },
    },
  ]

  return (
    <div className="ag-theme-alpine custom-space relative h-full">
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={{ sortable: true, filter: true, minWidth: 100 }}
        domLayout="normal"
        theme="legacy"
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        getRowId={(params: GetRowIdParams<User>) => params.data.id}
        scrollbarWidth={16}
      />
    </div>
  )
})

export default UserTable