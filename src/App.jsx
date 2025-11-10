/**
 * @file App.jsx
 * @description Componente principal de la aplicación sin autenticación
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Proyectos from './modules/proyectos/Proyectos';
import Empresas from './modules/empresas/Empresas';
import Estados from './modules/estados/Estados';
import TipoProyecto from './modules/tipoProyecto/TipoProyecto';
import Fases from './modules/fases/Fases';
import Sistemas from './modules/sistemas/Sistemas';
import Subsistemas from './modules/subsistemas/Subsistemas';
import Ramas from './modules/ramas/Ramas';

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirigir raíz a dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Rutas con Layout */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/proyectos" element={<Layout><Proyectos /></Layout>} />
        <Route path="/empresas" element={<Layout><Empresas /></Layout>} />
        <Route path="/estados" element={<Layout><Estados /></Layout>} />
        <Route path="/tipo-proyecto" element={<Layout><TipoProyecto /></Layout>} />
        <Route path="/fases" element={<Layout><Fases /></Layout>} />
        <Route path="/sistemas" element={<Layout><Sistemas /></Layout>} />
        <Route path="/subsistemas" element={<Layout><Subsistemas /></Layout>} />
        <Route path="/ramas" element={<Layout><Ramas /></Layout>} />
        
        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
