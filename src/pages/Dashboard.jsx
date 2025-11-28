/**
 * @file Dashboard.jsx
 * @description Dashboard principal con estadísticas visuales del sistema
 */

import { mockProyectos, mockEmpresas, mockEstados, mockSistemas } from '../shared/config/mockData';

export default function Dashboard() {
  // Calcular estadísticas
  const totalProyectos = mockProyectos.length;
  const totalEmpresas = mockEmpresas.length;
  const totalEstados = mockEstados.length;
  const totalSistemas = mockSistemas.length;
  
  const proyectosActivos = mockProyectos.filter(p => p.estadoId === 3).length;
  const empresasActivas = mockEmpresas.filter(e => e.estadoId === 1).length;

  const stats = [
    { 
      title: 'Proyectos', 
      value: totalProyectos, 
      icon: '📋', 
      color: 'bg-blue-500',
      subtitle: `${proyectosActivos} en proceso`
    },
    { 
      title: 'Empresas', 
      value: totalEmpresas, 
      icon: '🏢', 
      color: 'bg-green-500',
      subtitle: `${empresasActivas} activas`
    },
    { 
      title: 'Estados', 
      value: totalEstados, 
      icon: '🎯', 
      color: 'bg-yellow-500',
      subtitle: 'Configurados'
    },
    { 
      title: 'Sistemas', 
      value: totalSistemas, 
      icon: '💻', 
      color: 'bg-purple-500',
      subtitle: 'Registrados'
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white transition-colors">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">br br brbr patapim</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 hover:shadow-lg transition-all duration-200"
            style={{ borderLeftColor: stat.color.replace('bg-', '') }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium uppercase transition-colors">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2 transition-colors">{stat.value}</p>
                <p className="text-gray-500 dark:text-gray-500 text-xs mt-1 transition-colors">{stat.subtitle}</p>
              </div>
              <div className={`text-5xl ${stat.color} bg-opacity-20 dark:bg-opacity-30 p-4 rounded-full`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos Recientes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 transition-colors">📋 Proyectos Recientes</h2>
          <div className="space-y-3">
            {mockProyectos.slice(0, 5).map((proyecto) => (
              <div key={proyecto.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white transition-colors">{proyecto.nombre}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{proyecto.descripcion}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  proyecto.estadoId === 3 
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                    : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                  {proyecto.estadoId === 3 ? 'En Proceso' : 'Otro'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Empresas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 transition-colors">🏢 Empresas</h2>
          <div className="space-y-3">
            {mockEmpresas.map((empresa) => (
              <div key={empresa.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white transition-colors">{empresa.nombre}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{empresa.correo}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  empresa.estadoId === 1 
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                    : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                }`}>
                  {empresa.estadoId === 1 ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
