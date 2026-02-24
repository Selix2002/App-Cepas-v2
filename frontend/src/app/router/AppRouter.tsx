// src/routers/AppRouter.tsx
import {Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from "react";
import LoginPage from '../../features/auth/pages/LoginPage';
import PrivateRoute from './PrivateRoute';

  // Lazy imports (se convierten en chunks separados)
const HomePage = lazy(
  () => import("../../features/cepas/pages/HomePage")
);
const NewCepaPage = lazy(
  () => import("../../features/cepas/pages/NewCepaPage")
);
const NewAtributePage = lazy(
  () => import("../../features/cepas/pages/NewAtributePage")
);
const UserManagementPage = lazy(
  () => import("../../features/users/pages/UserManagement")
);

export default function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          Cargando…
        </div>
      }
    >
      <Routes>
        {/* Ruta pública: va en el bundle inicial */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas: sus páginas son lazy */}
        <Route element={<PrivateRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/home/addcepa" element={<NewCepaPage />} />
          <Route path="/home/addatribute" element={<NewAtributePage />} />
          <Route path="/home/UserManagement" element={<UserManagementPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
