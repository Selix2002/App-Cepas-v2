// src/features/auth/pages/LoginPage.tsx
import { useLoginForm } from '../hooks/useLoginForm'

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
    <div className="relative font-sans min-h-screen antialiased bg-gradient-to-tr from-gray-900 to-green-800 pt-24 pb-5">
      {/* Banner de error fijo */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
          {error}
        </div>
      )}

      <div className="flex flex-col justify-center sm:w-96 sm:mx-auto mx-5 mb-5 space-y-8">
        <h1 className="font-bold text-center text-4xl text-yellow-500">
          Administrar <span className="text-blue-500">Cepas</span>
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col bg-white p-10 rounded-lg shadow space-y-6"
        >
          <h2 className="font-bold text-xl text-center">
            Inicia sesión para continuar
          </h2>

          <div className="flex flex-col space-y-1">
            <input
              type="text"
              name="username"
              id="username"
              placeholder="Nombre de usuario"
              className="border-2 rounded px-3 py-2 w-full focus:outline-none focus:border-blue-400 focus:shadow"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col space-y-1">
            <input
              type="password"
              name="password"
              id="password"
              placeholder="Contraseña"
              className="border-2 rounded px-3 py-2 w-full focus:outline-none focus:border-blue-400 focus:shadow"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 text-white py-2 px-6 rounded hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Ingresando...' : 'Aceptar'}
            </button>
          </div>
        </form>

        <div className="flex justify-center text-gray-500 text-sm">
          <p>
            &copy;2025, SM. Todos los derechos reservados. Se recomienda el uso del navegador Firefox.
          </p>
        </div>
      </div>
    </div>
  )
}
