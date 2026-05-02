import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  Building2,
  ListChecks,
  Tags,
  ArrowRight,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { proyectosService, empresasService, tareasService, etiquetasService, estadosService } from '../shared/services';
import { useAuth } from '../context/AuthContext';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ proyectos: [], empresas: [], tareas: [], etiquetas: [], estados: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [proyectos, empresas, tareas, etiquetas, estados] = await Promise.all([
          proyectosService.getAll(),
          empresasService.getAll(),
          tareasService.getAll(),
          etiquetasService.getAll(),
          estadosService.getAll(),
        ]);
        setData({ proyectos, empresas, tareas, etiquetas, estados });
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = [
    {
      label: 'Proyectos',
      value: data.proyectos.length,
      icon: FolderKanban,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      link: '/proyectos',
    },
    {
      label: 'Empresas',
      value: data.empresas.length,
      icon: Building2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      link: '/empresas',
    },
    {
      label: 'Tareas',
      value: data.tareas.length,
      icon: ListChecks,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      link: '/tareas',
    },
    {
      label: 'Etiquetas',
      value: data.etiquetas.length,
      icon: Tags,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      link: '/etiquetas',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-white">
          Hola, {user?.nombre} {user?.apellido}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Aquí tienes un resumen de tu espacio de trabajo</p>
      </div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} variants={item}>
              <Link
                to={s.link}
                className="block bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/50 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent projects */}
        <motion.div variants={item} initial="hidden" animate="show" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-500" />
              Proyectos recientes
            </h2>
            <Link to="/proyectos" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {data.proyectos.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No hay proyectos</p>
            ) : (
              data.proyectos.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-white truncate">{p.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.empresaNombre || 'Sin empresa'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.prioridad && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.prioridad === 'ALTA' || p.prioridad === 'CRITICA'
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          : p.prioridad === 'MEDIA'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-600/50 text-slate-600 dark:text-slate-400'
                      }`}>
                        {p.prioridad}
                      </span>
                    )}
                    {p.estadoNombre && (() => {
                      const color = data.estados.find((e) => e.id === p.estadoId)?.color || '#6366f1';
                      return (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: color + '22', color }}
                        >
                          {p.estadoNombre}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent tasks */}
        <motion.div variants={item} initial="hidden" animate="show" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-amber-500" />
              Tareas recientes
            </h2>
            <Link to="/tareas" className="text-sm text-blue-500 hover:text-blue-600 font-medium">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {data.tareas.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No hay tareas</p>
            ) : (
              data.tareas.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-white truncate">{t.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {t.fechaLimite ? new Date(t.fechaLimite).toLocaleDateString() : 'Sin fecha'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.prioridad && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.prioridad === 'ALTA' || t.prioridad === 'CRITICA'
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                          : t.prioridad === 'MEDIA'
                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-600/50 text-slate-600 dark:text-slate-400'
                      }`}>
                        {t.prioridad}
                      </span>
                    )}
                    {t.estadoNombre && (() => {
                      const color = data.estados.find((e) => e.id === t.estadoId)?.color || '#6366f1';
                      return (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: color + '22', color }}
                        >
                          {t.estadoNombre}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
