// src/features/users/components/UserTable.tsx
// Reemplaza completamente ag-grid. Sin imports de ag-grid-react ni ag-grid-community.
// Conserva exactamente la misma lógica: editar username, toggle admin, eliminar, no auto-eliminar.

import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type KeyboardEvent,
} from "react"
import { getUsers, createUser, updateUser, deleteUser } from "../services/UsersQuery"
import type { User } from "../../../shared/interfaces"
import { useAuth } from "../../auth/store/AuthContext"

export interface UserTableHandles {
  onAddUser: () => Promise<void>
}

type EditingCell = {
  id: string
  field: "username" | "is_admin"
  value: string
}

type SortDir = "asc" | "desc"

// ── helpers ──────────────────────────────────────────────────────────────────
const S = {
  wrap: {
    height: "100%",
    background: "#070c16",
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    color: "#e8f4f0",
  },
  searchWrap: {
    padding: "7px 16px",
    background: "#0b1220",
    borderBottom: "1px solid #1a2f28",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    background: "#0f1a2e",
    border: "1px solid #1a2f28",
    borderRadius: 4,
    color: "#e8f4f0",
    fontFamily: "inherit",
    fontSize: 12,
    padding: "5px 12px",
    outline: "none",
  },
  tableWrap: {
    flex: 1,
    overflowY: "auto" as const,
    overflowX: "auto" as const,
  },
  table: {
    borderCollapse: "collapse" as const,
    width: "100%",
    tableLayout: "fixed" as const,
    whiteSpace: "nowrap" as const,
  },
  th: {
    position: "sticky" as const,
    top: 0,
    background: "#0f1a2e",
    color: "#3a6a5a",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    fontWeight: 700,
    padding: "7px 12px",
    borderBottom: "1px solid #1a2f28",
    borderRight: "1px solid #0f2020",
    cursor: "pointer",
    userSelect: "none" as const,
    zIndex: 10,
  },
  td: {
    padding: "6px 12px",
    borderBottom: "1px solid #0f2020",
    borderRight: "1px solid #0f2020",
    fontSize: 12,
    color: "#8ab0a0",
    verticalAlign: "middle" as const,
  },
  tdFrozen: {
    position: "sticky" as const,
    left: 0,
    background: "#0b1220",
    zIndex: 5,
    borderRight: "1px solid #00e5b422",
    fontWeight: 700,
    color: "#00e5b4",
  },
  editInput: {
    background: "#00e5b408",
    border: "1px solid #00b48e",
    borderRadius: 3,
    color: "#e8f4f0",
    fontFamily: "inherit",
    fontSize: 12,
    padding: "2px 8px",
    outline: "none",
    width: "100%",
  },
  pill: (val: boolean) => ({
    display: "inline-block",
    padding: "1px 8px",
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
    background: val ? "#00e5b422" : "#ff4d6d22",
    color:      val ? "#00e5b4"   : "#ff4d6d",
    border:     val ? "1px solid #00e5b433" : "1px solid #ff4d6d33",
    cursor: "pointer",
  }),
  deleteBtn: (disabled: boolean) => ({
    background: "transparent",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 15,
    opacity: disabled ? 0.3 : 1,
    padding: 0,
  }),
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 16px",
    background: "#0b1220",
    borderTop: "1px solid #1a2f28",
    flexShrink: 0,
  },
  pageBtn: {
    padding: "3px 10px",
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
    border: "1px solid #1a2f28",
    background: "transparent",
    color: "#8ab0a0",
    cursor: "pointer",
    fontFamily: "inherit",
  },
}

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

  // ── load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const { items } = await getUsers()
      setUsers(items)
    } catch (err) {
      console.error("Error cargando usuarios:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── add (imperative handle — llamado desde header) ────────────────────────
  const onAddUser = async () => {
    const username = window.prompt("Nombre de usuario:")
    if (!username?.trim()) return
    const pwd = window.prompt("Contraseña (mínimo 8 caracteres):")
    if (!pwd) return
    try {
      const nuevo = await createUser({ username: username.trim(), password: pwd, is_admin: false })
      setUsers((prev) => [...prev, nuevo])
    } catch (err) {
      console.error("Error creando usuario:", err)
      window.alert("No se pudo crear el usuario.")
    }
  }

  useImperativeHandle(ref, () => ({ onAddUser }))

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
    if (sortField !== field) return <span style={{ color: "#1e3a30", marginLeft: 3 }}>⇅</span>
    return (
      <span style={{ color: "#00e5b4", marginLeft: 3 }}>
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
    <div style={S.wrap}>
      {/* stats bar */}
      <div
        style={{
          display: "flex",
          gap: 1,
          background: "#1a2f28",
          borderBottom: "1px solid #1a2f28",
          flexShrink: 0,
        }}
      >
        {[
          { val: users.length,    lbl: "Usuarios totales" },
          { val: filtered.length, lbl: "Mostrando" },
          { val: users.filter((u) => u.is_admin).length, lbl: "Administradores" },
        ].map(({ val, lbl }) => (
          <div key={lbl} style={{ flex: 1, background: "#0b1220", padding: "6px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#00e5b4" }}>{val}</div>
            <div style={{ fontSize: 9, color: "#3a6a5a", letterSpacing: 1, textTransform: "uppercase" }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* search */}
      <div style={S.searchWrap}>
        <span style={{ fontSize: 14, color: "#3a6a5a" }}>⌕</span>
        <input
          style={S.searchInput}
          placeholder="Buscar por nombre o ID…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ background: "transparent", border: "none", color: "#3a6a5a", cursor: "pointer", fontSize: 14, padding: "0 4px", fontFamily: "inherit" }}
          >
            ✕
          </button>
        )}
        <span style={{ fontSize: 10, color: "#3a6a5a", letterSpacing: 1, whiteSpace: "nowrap" }}>
          {filtered.length} / {users.length} usuarios
        </span>
      </div>

      {/* table */}
      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "#3a6a5a", letterSpacing: 2, fontSize: 12 }}>
          Cargando usuarios…
        </div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {(
                  [
                    { field: "id",       label: "ID",              width: 240 },
                    { field: "username", label: "Usuario",         width: 200 },
                    { field: "is_admin", label: "Administrador",   width: 140 },
                    { field: null,       label: "Eliminar",        width: 80  },
                  ] as const
                ).map((col) => (
                  <th
                    key={col.label}
                    style={{
                      ...S.th,
                      width: col.width,
                      minWidth: col.width,
                      ...(col.field === "id" ? S.tdFrozen : {}),
                      color: sortField === col.field ? "#00e5b4" : "#3a6a5a",
                    }}
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
                  <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#1e3a30", letterSpacing: 1, padding: 28 }}>
                    Sin resultados
                  </td>
                </tr>
              ) : (
                displayed.map((u, i) => {
                  const isSelf   = u.id === currentUser?.id
                  const isEditing = editingCell?.id === u.id && editingCell.field === "username"
                  const rowBg     = i % 2 === 0 ? "#0d1628" : "#0b1220"

                  return (
                    <tr
                      key={u.id}
                      style={{ background: rowBg }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#162038")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                    >
                      {/* ID — frozen */}
                      <td style={{ ...S.td, ...S.tdFrozen, background: rowBg }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>{u.id}</span>
                      </td>

                      {/* username — doble click edita */}
                      <td
                        style={{ ...S.td, cursor: isSelf ? "default" : "pointer" }}
                        onDoubleClick={() => startEdit(u)}
                        title={isSelf ? "No puedes editar tu propio usuario" : "Doble click para editar"}
                      >
                        {isEditing ? (
                          <input
                            style={S.editInput}
                            autoFocus
                            value={editingCell!.value}
                            onChange={(e) =>
                              setEditingCell((prev) => prev ? { ...prev, value: e.target.value } : null)
                            }
                            onKeyDown={onEditKeyDown}
                            onBlur={commitEdit}
                          />
                        ) : (
                          <span>{u.username}{isSelf && <span style={{ fontSize: 9, color: "#3a6a5a", marginLeft: 6 }}>(tú)</span>}</span>
                        )}
                      </td>

                      {/* is_admin — pill clickeable */}
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <span
                          style={S.pill(u.is_admin)}
                          onClick={() => !isSelf && toggleAdmin(u)}
                          title={isSelf ? "No puedes cambiar tu propio rol" : "Click para alternar"}
                        >
                          {u.is_admin ? "Sí" : "No"}
                        </span>
                      </td>

                      {/* delete */}
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button
                          style={S.deleteBtn(isSelf)}
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
      <div style={S.pagination}>
        <span style={{ fontSize: 10, color: "#3a6a5a", letterSpacing: 1 }}>
          Página {page} de {totalPages} · {filtered.length} usuarios
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button style={S.pageBtn} disabled={page <= 1}          onClick={() => setPage(1)}>«</button>
          <button style={S.pageBtn} disabled={page <= 1}          onClick={() => setPage((p) => p - 1)}>‹</button>
          <span style={{ fontSize: 10, color: "#8ab0a0", minWidth: 40, textAlign: "center" }}>
            {page} / {totalPages}
          </span>
          <button style={S.pageBtn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
          <button style={S.pageBtn} disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</button>
        </div>
      </div>
    </div>
  )
})

UserTable.displayName = "UserTable"
export default UserTable
