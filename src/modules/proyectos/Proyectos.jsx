import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, FolderKanban, Search, Calendar, TrendingUp, Tag, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  proyectosService,
  empresasService,
  tiposProyectoService,
  estadosService,
  miembrosEmpresaService,
  miembrosProyectoService,
} from '@/shared/services';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { ConfirmDialog } from '@/shared/components';
import { useAuth } from '@/context/AuthContext';
import FormProyectos from './FormProyectos';
import ModalProyectoMiembros from './ModalProyectoMiembros';

export default function Proyectos() {
  const { user } = useAuth();
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [tiposProyecto, setTiposProyecto] = useState([]);
  const [estados, setEstados] = useState([]);
  const [miembrosPorEmpresa, setMiembrosPorEmpresa] = useState({});
  const [miembrosPorProyecto, setMiembrosPorProyecto] = useState({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [confirmItem, setConfirmItem] = useState(null);
  const [miembrosModalProyecto, setMiembrosModalProyecto] = useState(null);

  const cargarMapasMiembros = useCallback(async (listaProyectos) => {
    const empresaIds = [...new Set(listaProyectos.map((pr) => pr.empresaId).filter(Boolean))];
    const [empresaEntries, proyectoEntries] = await Promise.all([
      Promise.all(
        empresaIds.map(async (id) => {
          try { return [id, await miembrosEmpresaService.getByEmpresa(id)]; }
          catch { return [id, []]; }
        })
      ),
      Promise.all(
        listaProyectos.map(async (pr) => {
          try { return [pr.id, await miembrosProyectoService.getByProyecto(pr.id)]; }
          catch { return [pr.id, []]; }
        })
      ),
    ]);
    setMiembrosPorEmpresa(Object.fromEntries(empresaEntries));
    setMiembrosPorProyecto(Object.fromEntries(proyectoEntries));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, e, tp, est] = await Promise.all([
          proyectosService.getAll(),
          empresasService.getAll(),
          tiposProyectoService.getAll(),
          estadosService.getAll(),
        ]);
        if (cancelled) return;
        setProyectos(p);
        setEmpresas(e);
        setTiposProyecto(tp);
        setEstados(est);
        setLoading(false);
        cargarMapasMiembros(p);
      } catch (err) {
        if (!cancelled) {
          toast.error(getErrorMessage(err, 'Error al cargar los proyectos'));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [cargarMapasMiembros]);

  const permisosProyecto = useMemo(() => {
    if (!user?.id) return {};
    const uid = Number(user.id);
    const result = {};
    proyectos.forEach((pr) => {
      if (uid === Number(pr.creadorId)) { result[pr.id] = true; return; }
      const emp = empresas.find((x) => x.id === pr.empresaId);
      if (emp && uid === Number(emp.creadorId)) { result[pr.id] = true; return; }
      const me = miembrosPorEmpresa[pr.empresaId] || [];
      if (me.some((m) => Number(m.usuarioId) === uid && String(m.rol || '').toUpperCase() === 'ADMIN')) {
        result[pr.id] = true; return;
      }
      const mp = miembrosPorProyecto[pr.id] || [];
      result[pr.id] = mp.some((m) => Number(m.usuarioId) === uid && String(m.rol || '').toUpperCase() === 'LIDER');
    });
    return result;
  }, [proyectos, empresas, miembrosPorEmpresa, miembrosPorProyecto, user?.id]);

  const puedeGestionarProyecto = useCallback((pr) => !!permisosProyecto[pr?.id], [permisosProyecto]);

  const miembrosEmpresaIdsParaModal = useMemo(() => {
    if (!miembrosModalProyecto) return [];
    const emp = empresas.find((x) => x.id === miembrosModalProyecto.empresaId);
    const ids = new Set();
    if (emp?.creadorId != null) ids.add(Number(emp.creadorId));
    (miembrosPorEmpresa[miembrosModalProyecto.empresaId] || []).forEach((m) => {
      if (m.activo !== false) ids.add(Number(m.usuarioId));
    });
    return Array.from(ids);
  }, [miembrosModalProyecto, empresas, miembrosPorEmpresa]);

  const handleDelete = (proyecto) => {
    if (proyecto.estadoNombre?.toLowerCase() !== 'completado') {
      toast.error('Solo se pueden eliminar proyectos con estado "Completado"');
      return;
    }
    setConfirmItem(proyecto);
  };

  const reloadData = useCallback(async () => {
    try {
      const [p, e, tp, est] = await Promise.all([
        proyectosService.getAll(),
        empresasService.getAll(),
        tiposProyectoService.getAll(),
        estadosService.getAll(),
      ]);
      setProyectos(p);
      setEmpresas(e);
      setTiposProyecto(tp);
      setEstados(est);
      cargarMapasMiembros(p);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al recargar los proyectos'));
    }
  }, [cargarMapasMiembros]);

  const doDelete = async () => {
    try {
      await proyectosService.delete(confirmItem.id);
      toast.success('Proyecto eliminado');
      reloadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al eliminar el proyecto'));
    } finally {
      setConfirmItem(null);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editItem) {
        await proyectosService.update(editItem.id, data);
        toast.success('Proyecto actualizado');
      } else {
        await proyectosService.create(data);
        toast.success('Proyecto creado');
      }
      setFormOpen(false);
      setEditItem(null);
      reloadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al guardar el proyecto'));
    }
  };

  const filtered = proyectos.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.empresaNombre?.toLowerCase().includes(search.toLowerCase())
  );

  const priorityColor = (p) => {
    if (p === 'CRITICA' || p === 'ALTA') return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400';
    if (p === 'MEDIA') return 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400';
    return 'bg-slate-100 dark:bg-slate-600/50 text-slate-600 dark:text-slate-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Proyectos</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{proyectos.length} proyectos</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditItem(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proyecto
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o empresa..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filtered.map((proyecto) => (
            <motion.div
              key={proyecto.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-white truncate">{proyecto.nombre}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {proyecto.empresaNombre && <span>{proyecto.empresaNombre}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    title="Equipo"
                    onClick={() => setMiembrosModalProyecto(proyecto)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  {puedeGestionarProyecto(proyecto) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditItem(proyecto);
                          setFormOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(proyecto)}
                        disabled={proyecto.estadoNombre?.toLowerCase() !== 'completado'}
                        title={
                          proyecto.estadoNombre?.toLowerCase() !== 'completado'
                            ? 'Solo se puede eliminar cuando el estado es Completado'
                            : 'Eliminar proyecto'
                        }
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {proyecto.descripcion && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{proyecto.descripcion}</p>
              )}

              {proyecto.progreso != null && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Progreso
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{proyecto.progreso}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min(proyecto.progreso, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                {proyecto.tipoProyectoNombre &&
                  (() => {
                    const tp = tiposProyecto.find((t) => t.id === proyecto.tipoProyectoId);
                    const color = tp?.color || '#6366f1';
                    return (
                      <span
                        className="px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        <Tag className="w-3 h-3" />
                        {proyecto.tipoProyectoNombre}
                      </span>
                    );
                  })()}
                {proyecto.prioridad && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${priorityColor(proyecto.prioridad)}`}>
                    {proyecto.prioridad}
                  </span>
                )}
                {proyecto.estadoNombre &&
                  (() => {
                    const color = estados.find((e) => e.id === proyecto.estadoId)?.color || '#6366f1';
                    return (
                      <span
                        className="px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        {proyecto.estadoNombre}
                      </span>
                    );
                  })()}
                {proyecto.fechaInicio && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(proyecto.fechaInicio).toLocaleDateString()}
                  </span>
                )}
                {proyecto.fechaFinEstimada && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(proyecto.fechaFinEstimada).toLocaleDateString()}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No se encontraron proyectos</p>
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <FormProyectos
            onClose={() => {
              setFormOpen(false);
              setEditItem(null);
            }}
            onSave={handleSave}
            initialData={editItem}
            empresas={empresas}
            tiposProyecto={tiposProyecto}
            estados={estados}
          />
        )}
      </AnimatePresence>

      <ModalProyectoMiembros
        proyecto={miembrosModalProyecto}
        open={!!miembrosModalProyecto}
        onClose={() => setMiembrosModalProyecto(null)}
        canManage={miembrosModalProyecto ? puedeGestionarProyecto(miembrosModalProyecto) : false}
        currentUserId={user?.id}
        miembrosEmpresaIds={miembrosEmpresaIdsParaModal}
        onUpdated={() => cargarMapasMiembros(proyectos)}
      />

      <ConfirmDialog
        open={!!confirmItem}
        title="Eliminar proyecto"
        message={`¿Estás seguro de que quieres eliminar "${confirmItem?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={doDelete}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
}
