// src/app/router/AdminRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/store/AuthContext';

// F1: guard de rol para rutas de admin. Pensado para anidarse dentro de PrivateRoute,
// pero también verifica el token por si se usa de forma independiente.
const AdminRoute: React.FC = () => {
  const { token, user } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // Tras un refresh, token existe pero user se rehidrata async (getCurrentUser en
  // AuthContext). No decidir hasta que user cargue, para no expulsar a un admin legítimo.
  if (!user) {
    return <div className="app-router-fallback">Cargando…</div>;
  }
  if (!user.is_admin) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
};

export default AdminRoute;
