import { useState, useEffect } from 'react';
import { proyectosService } from '../shared/services/proyectosService';
import { empresasService } from '../shared/services/empresasService';
import { estadosService } from '../shared/services/estadosService';
import { sistemasService } from '../shared/services/sistemasService';

export default function Dashboard() {
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [estados, setEstados] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [proyectosData, empresasData, estadosData, sistemasData] = await Promise.all([
          proyectosService.getAll(),
          empresasService.getAll(),
          estadosService.getAll(),
          sistemasService.getAll(),
        ]);
        setProyectos(proyectosData);
        setEmpresas(empresasData);
        setEstados(estadosData);
        setSistemas(sistemasData);
      } catch (err) {
        setError('No se pudo conectar con el backend. Verifica que el servidor esté corriendo.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = [
    {
      title: 'Proyectos',
      value: proyectos.length,
      icon: '📋',
      color: 'bg-blue-500',
      subtitle: `${proyectos.filter(p => p.estadoNombre === 'En Proceso').length} en proceso`,
    },
    {
      title: 'Empresas',
      value: empresas.length,
      icon: '🏢',
      color: 'bg-green-500',
      subtitle: `${empresas.filter(e => e.estadoNombre === 'Activo').length} activas`,
    },
    {
      title: 'Estados',
      value: estados.length,
      icon: '🎯',
      color: 'bg-yellow-500',
      subtitle: 'Configurados',
    },
    {
      title: 'Sistemas',
      value: sistemas.length,
      icon: '💻',
      color: 'bg-purple-500',
      subtitle: 'Registrados',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-600 dark:text-red-400 text-lg font-medium">⚠️ Error de conexión</p>
          <p className="text-red-500 dark:text-red-300 mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white transition-colors">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">Resumen general del sistema</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 transition-colors">📋 Proyectos Recientes</h2>
          <div className="space-y-3">
            {proyectos.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No hay proyectos registrados</p>
            ) : (
              proyectos.slice(0, 5).map((proyecto) => (
                <div key={proyecto.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white transition-colors">{proyecto.nombre}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{proyecto.descripcion}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    proyecto.estadoNombre === 'En Proceso'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                  }`}>
                    {proyecto.estadoNombre || 'Sin estado'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 transition-colors">🏢 Empresas</h2>
          <div className="space-y-3">
            {empresas.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No hay empresas registradas</p>
            ) : (
              empresas.map((empresa) => (
                <div key={empresa.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white transition-colors">{empresa.nombre}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{empresa.correo}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    empresa.estadoNombre === 'Activo'
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {empresa.estadoNombre || 'Sin estado'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
