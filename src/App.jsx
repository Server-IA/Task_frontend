import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import ProtectedRoute from './shared/components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import Proyectos from './modules/proyectos/Proyectos';
import Empresas from './modules/empresas/Empresas';
import Estados from './modules/estados/Estados';
import TipoProyecto from './modules/tipoProyecto/TipoProyecto';
import Tareas from './modules/tareas/Tareas';
import Perfil from './pages/Perfil';

function AppRoute({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Auth routes (public) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verificar-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AppRoute><Dashboard /></AppRoute>} />
        <Route path="/empresas" element={<AppRoute><Empresas /></AppRoute>} />
        <Route path="/proyectos" element={<AppRoute><Proyectos /></AppRoute>} />
        <Route path="/tareas" element={<AppRoute><Tareas /></AppRoute>} />
        <Route path="/estados" element={<AppRoute><Estados /></AppRoute>} />
        <Route path="/tipo-proyecto" element={<AppRoute><TipoProyecto /></AppRoute>} />
        <Route path="/perfil" element={<AppRoute><Perfil /></AppRoute>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
