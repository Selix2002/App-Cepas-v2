// src
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { AgGridReact } from "ag-grid-react";
import { loader } from '../../../shared/utils/loader';
import type {
  GridApi,
  GridReadyEvent,
  CellValueChangedEvent,
  ICellRendererParams,
  GetRowIdParams,
} from "ag-grid-community";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../services/UsersQuery";
import type { User, UserCreate } from "../../../shared/interfaces/index";
import { useAuth } from "../../auth/store/AuthContext";
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';


type RowUser = User & Partial<UserCreate>;

// 1. Definir la interfaz para las funciones que se van a exponer
export interface UserTableHandles {
  onAddUser: () => Promise<void>;
}

// 2. Envolver el componente en `forwardRef` para que pueda recibir una ref
const UserTable = forwardRef<UserTableHandles>((_, ref) => {
  const { user: currentUser } = useAuth();
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<RowUser[]>([]);

  useEffect(() => {
    if (gridApi) loadUsers();
  }, [gridApi]);

  const loadUsers = async () => {
    try {
      loader(true);
      setRowData(await getUsers());
      loader(false);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
    }
  };

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
  };

  const onAddUser = async () => {
    if (!gridApi) return;
    const pwd = window.prompt("Ingrese la contraseña para el nuevo usuario:");
    if (!pwd) return;

    try {
      loader(true);
      const nuevo = await createUser("Nuevo Usuario", pwd, false);
      loader(false);
      gridApi.applyTransaction({ add: [nuevo] });
    } catch (err) {
      console.error("Error creando usuario:", err);
      window.alert("No se pudo crear el usuario.");
    }
  };

  // 3. Usar `useImperativeHandle` para exponer la función `onAddUser` a través de la ref
  useImperativeHandle(ref, () => ({
    onAddUser,
  }));

  const onCellValueChanged = async (event: CellValueChangedEvent) => {
    // Prohibir editar al propio usuario
    if (event.data.id === currentUser?.id) {
      // Revertir el cambio visualmente en la grilla
      event.node.setDataValue(event.colDef.field!, event.oldValue);
      return;
    }
    const field = event.colDef.field;
    const user = event.data as RowUser;
    // 1. Comprobar solo si el campo modificado es "username"
    if (field === "username") {
      const newUsername = event.newValue;

      // 2. Buscar en los datos existentes si otro usuario ya tiene ese nombre
      //    Se excluye al usuario actual de la búsqueda (por su ID)
      const isDuplicate = rowData.some(
        (row) => row.username === newUsername && row.id !== user.id
      );

      // 3. Si se encuentra un duplicado...
      if (isDuplicate) {
        // Manda un alert al usuario
        window.alert(`El nombre de usuario “${newUsername}” ya existe. Por favor, elija otro.`);
        
        // Reviertimos el valor de la celda al valor original
        event.node.setDataValue(field, event.oldValue);
        
        // Detenemos la ejecución para no llamar a la API
        return; 
      }
    }
    // Si la validación pasa (o si se cambió otro campo como "isAdmin"), se procede a guardar
    try {
      if (user.id && (field === "username" || field === "isAdmin")) {
        await updateUser(user.id, user.username, user.isAdmin);
      }
    } catch (err) {
      console.error("Error guardando cambio de celda:", err);
      // Si hay un error en el servidor, también revertimos el cambio
      event.node.setDataValue(field!, event.oldValue);
    }
  };

  const onDeleteUser = async (user: RowUser) => {
    // Prohibir eliminar al propio usuario
    if (user.id === currentUser?.id) return;
    if (!window.confirm(`¿Eliminar al usuario “${user.username}”?`)) return;
    try {
      loader(true);
      await deleteUser(user.id);
      loader(false);
      await loadUsers();
      gridApi?.applyTransaction({ remove: [user] });
    } catch (err) {
      console.error("Error eliminando usuario:", err);
    }
  };

  const columnDefs = [
    { 
      field: "id", 
      headerName: "ID", 
      editable: false, 
      width: 80,
      sort: "asc",
    },
    {
      field: "username",
      headerName: "Usuario",
      flex: 1,
      editable: (params: { data: { id: number | undefined } }) =>
        params.data.id !== currentUser?.id,
    },
    {
      field: "isAdmin",
      headerName: "Administrador",
      editable: (params: { data: { id: number | undefined } }) =>
        params.data.id !== currentUser?.id,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: [true, false] },
      valueFormatter: (p: { value: boolean }) => (p.value ? "Sí" : "No"),
      cellStyle: { display: "flex", justifyContent: "center" },
    },
    {
      headerName: "Eliminar Usuario",
      cellRenderer: (params: ICellRendererParams<RowUser>) => {
        if (params.data?.id === currentUser?.id) {
          return (
            <button
              disabled
              title="No puedes eliminarte a ti mismo"
              className="drop opacity-50 cursor-not-allowed"
            >
              🚫
            </button>
          );
        }
        return (
          <button
            onClick={() => params.data && onDeleteUser(params.data)}
            title="Eliminar usuario"
            className="drop"
          >
            🗑️
          </button>
        );
      },
      suppressHeaderMenuButton: true,
      sortable: false,
      filter: false,
      cellStyle: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
    },
  ];

  const defaultColDef = { sortable: true, filter: true, minWidth: 100 };

  return (
    <div className="ag-theme-alpine custom-space relative h-full">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          domLayout="normal"
          theme="legacy"
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          getRowId={(params: GetRowIdParams<RowUser>) => params.data.id.toString()}
          scrollbarWidth={16} />
    </div>
  );
});

export default UserTable;