// src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/store/AuthContext';

const PrivateRoute: React.FC = () => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // Si hay token, renderiza las rutas hijas
  return <Outlet />;
};

export default PrivateRoute;