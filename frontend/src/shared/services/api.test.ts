import { describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "../../test/msw/server"
import { api } from "./api"

const ECHO_URL = "http://localhost:8000/__test-echo"

function mockEchoAuthorizationHeader() {
  server.use(
    http.get(ECHO_URL, ({ request }) => {
      return HttpResponse.json({
        authorization: request.headers.get("authorization"),
      })
    })
  )
}

describe("api interceptor", () => {
  it("adds the Authorization header when a token exists in localStorage", async () => {
    localStorage.setItem("auth_token", "abc123")
    mockEchoAuthorizationHeader()

    const { data } = await api.get("/__test-echo")

    expect(data.authorization).toBe("Bearer abc123")
  })

  it("does not add the Authorization header when there is no token", async () => {
    mockEchoAuthorizationHeader()

    const { data } = await api.get("/__test-echo")

    expect(data.authorization).toBeNull()
  })
})
