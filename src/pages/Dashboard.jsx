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
        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">br br brbr patapim</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 hover:shadow-lg transition-shadow"
            style={{ borderLeftColor: stat.color.replace('bg-', '') }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium uppercase">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                <p className="text-gray-500 text-xs mt-1">{stat.subtitle}</p>
              </div>
              <div className={`text-5xl ${stat.color} bg-opacity-20 p-4 rounded-full`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos Recientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Proyectos Recientes</h2>
          <div className="space-y-3">
            {mockProyectos.slice(0, 5).map((proyecto) => (
              <div key={proyecto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-medium text-gray-800">{proyecto.nombre}</p>
                  <p className="text-sm text-gray-500">{proyecto.descripcion}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  proyecto.estadoId === 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {proyecto.estadoId === 3 ? 'En Proceso' : 'Otro'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Empresas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🏢 Empresas</h2>
          <div className="space-y-3">
            {mockEmpresas.map((empresa) => (
              <div key={empresa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <p className="font-medium text-gray-800">{empresa.nombre}</p>
                  <p className="text-sm text-gray-500">{empresa.correo}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  empresa.estadoId === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
