import { api } from "../../../shared/services/api"
import type { User, UserCreate, UserUpdate, UserList, Token } from "../../../shared/interfaces"

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------

export async function login(username: string, password: string): Promise<string> {
  const params = new URLSearchParams()
  params.append("username", username)
  params.append("password", password)

  const { data } = await api.post<Token>("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })

  // A11: el token se persiste en localStorage (AuthContext) y el interceptor de `api`
  // lo inyecta en cada request → setear api.defaults aquí era redundante.
  return data.access_token
}

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/users/me")
  return data
}

export async function getUsers(): Promise<UserList> {
  const { data } = await api.get<UserList>("/users/")
  return data
}

export async function createUser(payload: UserCreate): Promise<User> {
  const { data } = await api.post<User>("/users/", payload)
  return data
}

export async function updateUser(id: string, payload: UserUpdate): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, payload)
  return data
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete<void>(`/users/${id}`)
}