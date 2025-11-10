/**
 * @file Layout.jsx
 * @description Layout principal de la aplicación sin autenticación
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/proyectos', label: 'Proyectos', icon: '📋' },
    { path: '/empresas', label: 'Empresas', icon: '🏢' },
    { path: '/tipo-proyecto', label: 'Tipos de Proyecto', icon: '📁' },
    { path: '/estados', label: 'Estados', icon: '🎯' },
    { path: '/fases', label: 'Fases', icon: '⚙️' },
    { path: '/sistemas', label: 'Sistemas', icon: '💻' },
    { path: '/subsistemas', label: 'Subsistemas', icon: '🔧' },
    { path: '/ramas', label: 'Ramas', icon: '🌳' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 md:hidden text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">
                T a s k F r o n t e n d
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 bg-gray-100 px-4 py-2 rounded-md">
                Modo Visual o cambio de colores xd
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } md:block w-64 bg-white shadow-lg min-h-screen`}
        >
          <nav className="mt-5 px-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md mb-1 transition duration-200 ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-xl">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
