// src/routers/AppRouter.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from "react";
import LoginPage from '../../features/auth/pages/LoginPage';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import { IA_ENABLED } from '../../shared/config/features';
import './app-router.css';

const HomePage = lazy(() => import("../../features/cepas/pages/HomePage"));
const NewCepaPage = lazy(() => import("../../features/cepas/pages/NewCepaPage"));
const NewAtributePage = lazy(() => import("../../features/cepas/pages/NewAtributePage"));
const UserManagementPage = lazy(() => import("../../features/users/pages/UserManagement"));
const FeedbackPage = lazy(() => import("../../features/feedback/pages/FeedbackPage"));

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="app-router-fallback">Cargando…</div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<PrivateRoute />}>
          <Route path="/home"                  element={<HomePage />} />
          {/* F1: rutas solo-admin protegidas por rol (is_admin), no solo por token */}
          <Route element={<AdminRoute />}>
            <Route path="/home/addcepa"        element={<NewCepaPage />} />
            <Route path="/home/addatribute"    element={<NewAtributePage />} />
            <Route path="/home/UserManagement" element={<UserManagementPage />} />
            {/* IA off → la ruta de Feedback IA no se registra */}
            {IA_ENABLED && <Route path="/home/FeedbackIA"     element={<FeedbackPage />} />}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
