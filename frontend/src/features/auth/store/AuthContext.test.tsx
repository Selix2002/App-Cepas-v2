import { useState } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "../../../test/msw/server"
import { AuthProvider, useAuth } from "./AuthContext"

const API_URL = "http://localhost:8000"

function TestConsumer() {
  const { user, token, login, logout } = useAuth()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <div data-testid="token">{token ?? "no-token"}</div>
      <div data-testid="user">{user ? user.username : "no-user"}</div>
      {error && <div data-testid="error">{error}</div>}
      <button
        onClick={async () => {
          setError(null)
          try {
            await login("admin", "secret")
          } catch (e) {
            setError((e as Error).message)
          }
        }}
      >
        login
      </button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  )
}

describe("AuthContext", () => {
  it("login() success persists the token and the user", async () => {
    renderWithProvider()

    await userEvent.click(screen.getByText("login"))

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("fake-jwt-token")
    })
    expect(screen.getByTestId("user")).toHaveTextContent("admin")
    expect(localStorage.getItem("auth_token")).toBe("fake-jwt-token")
    expect(JSON.parse(localStorage.getItem("auth_user")!).username).toBe("admin")
  })

  it("login() with invalid credentials does not persist anything", async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () => {
        return HttpResponse.json(
          { detail: "Usuario o contraseña incorrectos" },
          { status: 401 }
        )
      })
    )
    renderWithProvider()

    await userEvent.click(screen.getByText("login"))

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument()
    })
    expect(screen.getByTestId("token")).toHaveTextContent("no-token")
    expect(localStorage.getItem("auth_token")).toBeNull()
  })

  it("rehydrates the user from /users/me when a token exists but no cached user", async () => {
    localStorage.setItem("auth_token", "existing-token")

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("admin")
    })
    expect(JSON.parse(localStorage.getItem("auth_user")!).username).toBe("admin")
  })

  it("clears token and user when rehydration fails (expired token)", async () => {
    localStorage.setItem("auth_token", "expired-token")
    server.use(
      http.get(`${API_URL}/users/me`, () => {
        return HttpResponse.json({ detail: "No autorizado" }, { status: 401 })
      })
    )

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("no-token")
    })
    expect(localStorage.getItem("auth_token")).toBeNull()
    expect(localStorage.getItem("auth_user")).toBeNull()
  })

  it("logout() clears state and localStorage", async () => {
    renderWithProvider()
    await userEvent.click(screen.getByText("login"))
    await waitFor(() => {
      expect(screen.getByTestId("token")).toHaveTextContent("fake-jwt-token")
    })

    await userEvent.click(screen.getByText("logout"))

    expect(screen.getByTestId("token")).toHaveTextContent("no-token")
    expect(screen.getByTestId("user")).toHaveTextContent("no-user")
    expect(localStorage.getItem("auth_token")).toBeNull()
    expect(localStorage.getItem("auth_user")).toBeNull()
  })
})
