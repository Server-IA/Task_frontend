import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from '@/layout/Layout';
import { ProtectedRoute } from '@/shared/components';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Proyectos from '@/modules/proyectos/Proyectos';
import Empresas from '@/modules/empresas/Empresas';
import Estados from '@/modules/estados/Estados';
import TipoProyecto from '@/modules/tipoProyecto/TipoProyecto';
import Tareas from '@/modules/tareas/Tareas';
import Perfil from '@/pages/Perfil';

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth (public) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verificar-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected — single layout wrapper */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/empresas" element={<Empresas />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/tareas" element={<Tareas />} />
          <Route path="/estados" element={<Estados />} />
          <Route path="/tipo-proyecto" element={<TipoProyecto />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
