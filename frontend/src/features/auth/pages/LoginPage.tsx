// src/features/auth/pages/LoginPage.tsx
import { useLoginForm } from "../hooks/useLoginForm"
import "./login.css"

export default function LoginPage() {
  const {
    username,
    setUsername,
    password,
    setPassword,
    error,
    isSubmitting,
    handleSubmit,
  } = useLoginForm()

  return (
    <div className="login-root">

      {/* ── fondo ── */}
      <div className="login-grid-bg" />
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      {/* ── wrapper: scan detrás, card delante ── */}
      <div className="login-card-wrap">

        {/* línea de escaneo — rebota arriba↔abajo, pasa detrás de la card */}
        <div className="login-scan" />

        <div className="login-card">
          <div className="login-corner-tl" />

          {/* logo */}
          <div className="login-logo-wrap">
            <span className="login-hex">⬡</span>
            <div className="login-logo-title">CEPADB</div>
            <div className="login-logo-sub">Sistema de Gestión · Patagonia</div>
          </div>

          {/* divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">Acceso al sistema</span>
            <div className="login-divider-line" />
          </div>

          {/* error */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* formulario */}
          <form onSubmit={handleSubmit} noValidate>

            {/* usuario */}
            <div className="login-input-group">
              <label htmlFor="username" className="login-input-label">
                Usuario
              </label>
              <div className="login-input-wrap">
                <input
                  id="username"
                  type="text"
                  className="login-input"
                  placeholder="Nombre de usuario"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <span className="login-input-icon">▷</span>
              </div>
            </div>

            {/* contraseña */}
            <div className="login-input-group">
              <label htmlFor="password" className="login-input-label">
                Contraseña
              </label>
              <div className="login-input-wrap">
                <input
                  id="password"
                  type="password"
                  className="login-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <span className="login-input-icon">◈</span>
              </div>
            </div>

            {/* submit */}
            <button
              type="submit"
              className="login-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verificando…" : "Ingresar →"}
            </button>
          </form>

          {/* status dots */}
          <div className="login-status-row">
            <div className="login-status-dot" />
            <div className="login-status-dot" />
            <div className="login-status-dot" />
            <span className="login-status-text">Sistema en línea</span>
          </div>
        </div>
      </div>

      {/* footer */}
      <p className="login-footer">
        ©2025 SM · Todos los derechos reservados
      </p>
    </div>
  )
}
