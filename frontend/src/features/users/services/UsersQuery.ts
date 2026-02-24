// src/services/UsersQuery.ts
import {api} from "../../../shared/services/api";
import type { Token, User } from '../../../shared/interfaces/index'


export interface LoginToken {
  accessToken: string
}

export async function getUsers(): Promise<User[]> {
  const { data: rawList } = await api.get<RawUser[]>(
    `/users/get-all`
  )
  return rawList.map((raw) => ({
    id: raw.id,
    username: raw.username,
    isAdmin: raw.is_admin,
  }))
}

// --- CREATE USER ---
export async function createUser(
  username: string,
  password: string,
  isAdmin: boolean
): Promise<User> {
  const payload = {
    username,
    password,
    is_admin: isAdmin,
  }
  const { data: raw } = await api.post<RawUser>(
    `/users/create`,
    payload
  )
  return {
    id: raw.id,
    username: raw.username,
    isAdmin: raw.is_admin,
  }
}
// El endpoint POST /users/create viene de tu UserController :contentReference[oaicite:3]{index=3}

// DELETE USER
/**
 * Borra un usuario por su ID.
 * @param id  ID del usuario a eliminar
 */
export async function deleteUser(id: number): Promise<void> {
  await api.delete<void>(`/users/delete/${id}`);
}

// --- UPDATE USER ---
export async function updateUser(
  id: number,
  username: string,
  isAdmin: boolean
): Promise<User> {
  const payload = {
    username,
    is_admin: isAdmin,
  }
  const { data: raw } = await api.patch<RawUser>(
    `/users/update/${id}`,
    payload
  )
  return {
    id: raw.id,
    username: raw.username,
    isAdmin: raw.is_admin,
  }
}


export async function login(
    username: string,
    password: string
  ): Promise<LoginToken> {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    const { data } = await api.post<Token>(
      `/auth/login`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
  
    // aquí hacemos el alias: tomo data.access_token y lo renombro a accessToken
    const { access_token: accessToken } = data  
  
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
    return { accessToken }
  }


  // esta interfaz solo la uso para mapear el JSON que devuelve el endpoint /users/me. 
interface RawUser {
  id: number
  username: string
  is_admin: boolean
  hidden_columns?: string[]; // Aseguramos que este campo sea opcional
}
interface RawUserWithHidden extends RawUser {
  hidden_columns: string[];
}

export async function updateVisibleCol(
  id: number,
  hiddenColumns: string[]
): Promise<User> {
  const payload = { hidden_columns: hiddenColumns };
  const { data: raw } = await api.patch<RawUserWithHidden>(
    `/users/update/${id}`,
    payload
  );

  return {
    id: raw.id,
    username: raw.username,
    isAdmin: raw.is_admin,
    // mapea el array de back-end al campo de tu interfaz
    hiddenColumns: raw.hidden_columns
  };
}


export async function getCurrentUser(): Promise<User> {
  const { data: raw } = await api.get<RawUserWithHidden>(
    `/users/me`
  )
  // aquí mapeamos is_admin → isAdmin
  const user: User = {
    id: raw.id,
    username: raw.username,
    isAdmin: raw.is_admin,
    hiddenColumns: raw.hidden_columns ?? [] // Aseguramos que sea un array
  }
  return user
}
