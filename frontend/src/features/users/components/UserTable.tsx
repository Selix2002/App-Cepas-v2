// src/features/users/components/UserTable.tsx
import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type KeyboardEvent,
} from "react"
import { getUsers, updateUser, deleteUser } from "../services/UsersQuery"
import type { User } from "../../../shared/interfaces"
import { useAuth } from "../../auth/store/AuthContext"
import { loader } from "../../../shared/utils/loader"
import "./user-table.css"

export interface UserTableHandles {
  addUser: (user: User) => void
}

type EditingCell = {
  id: string
  field: "username" | "is_admin"
  value: string
}

type SortDir = "asc" | "desc"

const COLS = [
  { field: "id",       label: "ID",            width: 240, frozen: true  },
  { field: "username", label: "Usuario",        width: 200, frozen: false },
  { field: "is_admin", label: "Administrador",  width: 140, frozen: false },
  { field: null,       label: "Eliminar",       width: 80,  frozen: false },
] as const

// ── component ─────────────────────────────────────────────────────────────────
const UserTable = forwardRef<UserTableHandles>((_, ref) => {
  const { user: currentUser } = useAuth()
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState("")
  const [sortField, setSortField]   = useState<"id" | "username" | "is_admin">("id")
  const [sortDir, setSortDir]       = useState<SortDir>("asc")
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [page, setPage]             = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    loader(true)
    try {
      const { items } = await getUsers()
      setUsers(items)
    } catch (err) {
      console.error("Error cargando usuarios:", err)
    } finally {
      setLoading(false)
      loader(false)
    }
  }

  const addUser = (user: User) => setUsers((prev) => [...prev, user])
  useImperativeHandle(ref, () => ({ addUser }))

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (u: User) => {
    if (u.id === currentUser?.id) return
    if (!window.confirm(`¿Eliminar al usuario "${u.username}"?`)) return
    try {
      await deleteUser(u.id)
      setUsers((prev) => prev.filter((r) => r.id !== u.id))
    } catch (err) {
      console.error("Error eliminando usuario:", err)
    }
  }

  // ── toggle is_admin ────────────────────────────────────────────────────────
  const toggleAdmin = async (u: User) => {
    if (u.id === currentUser?.id) return
    try {
      const updated = await updateUser(u.id, { username: u.username, is_admin: !u.is_admin })
      setUsers((prev) => prev.map((r) => (r.id === u.id ? updated : r)))
    } catch (err) {
      console.error("Error actualizando admin:", err)
    }
  }

  // ── inline edit username ──────────────────────────────────────────────────
  const startEdit = (u: User) => {
    if (u.id === currentUser?.id) return
    setEditingCell({ id: u.id, field: "username", value: u.username })
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const { id, value } = editingCell
    const u = users.find((r) => r.id === id)
    if (!u || u.username === value.trim()) { setEditingCell(null); return }

    const isDup = users.some((r) => r.username === value.trim() && r.id !== id)
    if (isDup) {
      window.alert(`El nombre "${value.trim()}" ya existe. Elige otro.`)
      setEditingCell(null)
      return
    }
    try {
      const updated = await updateUser(id, { username: value.trim(), is_admin: u.is_admin })
      setUsers((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (err) {
      console.error("Error actualizando usuario:", err)
    } finally {
      setEditingCell(null)
    }
  }

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")  commitEdit()
    if (e.key === "Escape") setEditingCell(null)
  }

  // ── sort ──────────────────────────────────────────────────────────────────
  const handleSort = (field: "id" | "username" | "is_admin") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortField(field); setSortDir("asc") }
  }

  const sortArrow = (field: string) => {
    if (sortField !== field)
      return <span className="ut-sort-arrow ut-sort-arrow-inactive">⇅</span>
    return (
      <span className="ut-sort-arrow ut-sort-arrow-active">
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    )
  }

  // ── derived ───────────────────────────────────────────────────────────────
  const filtered = users
    .filter((u) => {
      if (!search) return true
      const q = search.toLowerCase()
      return u.username.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1
      if (sortField === "is_admin")
        return (Number(a.is_admin) - Number(b.is_admin)) * mul
      const av = String(a[sortField] ?? "")
      const bv = String(b[sortField] ?? "")
      return av.localeCompare(bv) * mul
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const displayed  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="ut-wrap">
      {/* stats bar */}
      <div className="ut-stats-bar">
        {[
          { val: users.length,    lbl: "Usuarios totales" },
          { val: filtered.length, lbl: "Mostrando" },
          { val: users.filter((u) => u.is_admin).length, lbl: "Administradores" },
        ].map(({ val, lbl }) => (
          <div key={lbl} className="ut-stat-block">
            <div className="ut-stat-val">{val}</div>
            <div className="ut-stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>

      {/* search */}
      <div className="ut-search-wrap">
        <span className="ut-search-icon">⌕</span>
        <input
          className="ut-search-input"
          placeholder="Buscar por nombre o ID…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        {search && (
          <button className="ut-search-clear" onClick={() => setSearch("")}>✕</button>
        )}
        <span className="ut-search-count">
          {filtered.length} / {users.length} usuarios
        </span>
      </div>

      {/* table: el estado de carga lo muestra el overlay global (loadUsers) */}
      {loading ? null : (
        <div className="ut-table-wrap">
          <table className="ut-table">
            <thead>
              <tr>
                {COLS.map((col) => (
                  <th
                    key={col.label}
                    className={[
                      col.frozen ? "ut-th-frozen" : "",
                      col.field && sortField === col.field ? "sorted" : "",
                    ].filter(Boolean).join(" ")}
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => col.field && handleSort(col.field as typeof sortField)}
                  >
                    {col.label}{col.field && sortArrow(col.field)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ut-no-results">Sin resultados</td>
                </tr>
              ) : (
                displayed.map((u) => {
                  const isSelf    = u.id === currentUser?.id
                  const isEditing = editingCell?.id === u.id && editingCell.field === "username"

                  return (
                    <tr key={u.id}>
                      {/* ID — frozen */}
                      <td className="ut-td-frozen">
                        <span className="ut-id-cell">{u.id}</span>
                      </td>

                      {/* username */}
                      <td
                        className={isSelf ? "ut-td-readonly" : "ut-td-editable"}
                        onDoubleClick={() => startEdit(u)}
                        title={isSelf ? "No puedes editar tu propio usuario" : "Doble click para editar"}
                      >
                        {isEditing ? (
                          <input
                            className="ut-edit-input"
                            autoFocus
                            value={editingCell!.value}
                            onChange={(e) =>
                              setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)
                            }
                            onKeyDown={onEditKeyDown}
                            onBlur={commitEdit}
                          />
                        ) : (
                          <span>
                            {u.username}
                            {isSelf && <span className="ut-self-badge">(tú)</span>}
                          </span>
                        )}
                      </td>

                      {/* is_admin — pill */}
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`ut-pill ${u.is_admin ? "ut-pill-yes" : "ut-pill-no"}`}
                          onClick={() => !isSelf && toggleAdmin(u)}
                          title={isSelf ? "No puedes cambiar tu propio rol" : "Click para alternar"}
                        >
                          {u.is_admin ? "Sí" : "No"}
                        </span>
                      </td>

                      {/* delete */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="ut-delete-btn"
                          disabled={isSelf}
                          onClick={() => handleDelete(u)}
                          title={isSelf ? "No puedes eliminarte a ti mismo" : `Eliminar "${u.username}"`}
                        >
                          {isSelf ? "🚫" : "🗑️"}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* pagination */}
      <div className="ut-pagination">
        <span className="ut-page-info">
          Página {page} de {totalPages} · {filtered.length} usuarios
        </span>
        <div className="ut-page-controls">
          <button className="ut-page-btn" disabled={page <= 1}          onClick={() => setPage(1)}>«</button>
          <button className="ut-page-btn" disabled={page <= 1}          onClick={() => setPage((p) => p - 1)}>‹</button>
          <span className="ut-page-num">{page} / {totalPages}</span>
          <button className="ut-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
          <button className="ut-page-btn" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  )
})

UserTable.displayName = "UserTable"
export default UserTable
