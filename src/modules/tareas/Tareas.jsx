import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ListChecks, Search, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { tareasService, proyectosService, estadosService } from '@/shared/services';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { SelectField, ConfirmDialog } from '@/shared/components';
import FormTareas from './FormTareas';
import TareaDetalle from './TareaDetalle';

export default function Tareas() {
  const [tareas, setTareas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [detalleItem, setDetalleItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterProyecto, setFilterProyecto] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [confirmItem, setConfirmItem] = useState(null);

  const loadData = async () => {
    try {
      const [t, p, e] = await Promise.all([
        tareasService.getAll(),
        proyectosService.getAll(),
        estadosService.getAll(),
      ]);
      setTareas(t);
      setProyectos(p);
      setEstados(e);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al cargar las tareas'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = (tarea) => {
    if (tarea.estadoNombre?.toLowerCase() !== 'completado') {
      toast.error('Solo se pueden eliminar tareas con estado "Completado"');
      return;
    }
    setConfirmItem(tarea);
  };

  const doDelete = async () => {
    try {
      await tareasService.delete(confirmItem.id);
      toast.success('Tarea eliminada');
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al eliminar la tarea'));
    } finally {
      setConfirmItem(null);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editItem) {
        await tareasService.update(editItem.id, data);
        toast.success('Tarea actualizada');
      } else {
        await tareasService.create(data);
        toast.success('Tarea creada');
      }
      setFormOpen(false);
      setEditItem(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al guardar la tarea'));
    }
  };

  const filtered = tareas.filter((t) => {
    const matchSearch =
      t.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      t.descripcion?.toLowerCase().includes(search.toLowerCase());
    const matchProyecto = !filterProyecto || String(t.proyectoId) === filterProyecto;
    const matchEstado = !filterEstado || String(t.estadoId) === filterEstado;
    return matchSearch && matchProyecto && matchEstado;
  });

  const priorityColor = (p) => {
    if (p === 'CRITICA' || p === 'ALTA') return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400';
    if (p === 'MEDIA') return 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400';
    return 'bg-slate-100 dark:bg-slate-600/50 text-slate-600 dark:text-slate-400';
  };

  const isOverdue = (fecha) => {
    if (!fecha) return false;
    return new Date(fecha) < new Date() && !fecha.fechaCompletada;
  };

  // Kanban view grouped by estado
  const kanbanColumns = estados.map((est) => ({
    ...est,
    tareas: filtered.filter((t) => t.estadoId === est.id),
  }));

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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Tareas</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{tareas.length} tareas totales</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Kanban
            </button>
          </div>
          <button
            onClick={() => { setEditItem(null); setFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tareas..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="w-full sm:w-48">
          <SelectField value={filterProyecto} onChange={(e) => setFilterProyecto(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </SelectField>
        </div>
        <div className="w-full sm:w-44">
          <SelectField value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </SelectField>
        </div>
      </div>

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((tarea) => (
              <motion.div
                key={tarea.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setDetalleItem(tarea)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 dark:text-white truncate">{tarea.titulo}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {tarea.proyectoNombre && <span>{tarea.proyectoNombre}</span>}
                      {tarea.asignadoNombre && <span>@ {tarea.asignadoNombre}</span>}
                      {tarea.fechaLimite && (
                        <span className={`flex items-center gap-1 ${isOverdue(tarea.fechaLimite) ? 'text-red-500' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {new Date(tarea.fechaLimite).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {tarea.prioridad && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(tarea.prioridad)}`}>
                        {tarea.prioridad}
                      </span>
                    )}
                    {tarea.estadoNombre && (() => {
                      const color = estados.find((e) => e.id === tarea.estadoId)?.color || '#6366f1';
                      return (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: color + '22', color }}
                        >
                          {tarea.estadoNombre}
                        </span>
                      );
                    })()}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditItem(tarea); setFormOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(tarea); }}
                      disabled={tarea.estadoNombre?.toLowerCase() !== 'completado'}
                      title={tarea.estadoNombre?.toLowerCase() !== 'completado' ? 'Solo se puede eliminar cuando el estado es Completado' : 'Eliminar tarea'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Kanban view */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color || '#6366f1' }} />
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{col.nombre}</h3>
                <span className="text-xs text-slate-400 ml-auto">{col.tareas.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px] bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2">
                {col.tareas.map((tarea) => (
                  <motion.div
                    key={tarea.id}
                    layout
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setDetalleItem(tarea)}
                  >
                    <h4 className="font-medium text-slate-800 dark:text-white text-sm mb-1 truncate">{tarea.titulo}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {tarea.prioridad && (
                        <span className={`px-1.5 py-0.5 rounded font-medium ${priorityColor(tarea.prioridad)}`}>
                          {tarea.prioridad}
                        </span>
                      )}
                      {tarea.fechaLimite && (
                        <span className={`flex items-center gap-1 ${isOverdue(tarea.fechaLimite) ? 'text-red-500' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {new Date(tarea.fechaLimite).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {tarea.asignadoNombre && (
                      <p className="text-xs text-slate-400 mt-1.5">@ {tarea.asignadoNombre}</p>
                    )}
                  </motion.div>
                ))}
                {col.tareas.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">Sin tareas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && viewMode === 'list' && (
        <div className="text-center py-12">
          <ListChecks className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No se encontraron tareas</p>
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <FormTareas
            onClose={() => { setFormOpen(false); setEditItem(null); }}
            onSave={handleSave}
            initialData={editItem}
            proyectos={proyectos}
            estados={estados}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detalleItem && (
          <TareaDetalle
            tarea={detalleItem}
            estados={estados}
            onClose={() => setDetalleItem(null)}
            onEdit={(t) => { setDetalleItem(null); setEditItem(t); setFormOpen(true); }}
            onRefresh={loadData}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmItem}
        title="Eliminar tarea"
        message={`¿Estás seguro de que quieres eliminar "${confirmItem?.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={doDelete}
        onCancel={() => setConfirmItem(null)}
      />
    </div>
  );
}
