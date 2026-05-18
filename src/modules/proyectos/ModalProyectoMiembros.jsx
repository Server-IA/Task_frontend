import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { miembrosProyectoService, usuariosService } from '@/shared/services';
import { getErrorMessage } from '@/shared/lib/errorUtils';

const ROLES_PROYECTO = [
  { value: 'DESARROLLADOR', label: 'Desarrollador' },
  { value: 'DESARROLLADOR_BACKEND', label: 'Backend' },
  { value: 'DESARROLLADOR_FRONTEND', label: 'Frontend' },
  { value: 'QA', label: 'QA' },
  { value: 'DISEÑADOR', label: 'Diseño' },
  { value: 'LIDER', label: 'Líder' },
];

export default function ModalProyectoMiembros({
  proyecto,
  open,
  onClose,
  canManage,
  currentUserId,
  miembrosEmpresaIds,
  onUpdated,
}) {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [rolNuevo, setRolNuevo] = useState('DESARROLLADOR');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const empresaIdsSet = useMemo(
    () =>
      miembrosEmpresaIds instanceof Set
        ? miembrosEmpresaIds
        : new Set(miembrosEmpresaIds || []),
    [miembrosEmpresaIds]
  );

  const loadMiembros = useCallback(async () => {
    if (!proyecto?.id) return;
    setLoading(true);
    try {
      const data = await miembrosProyectoService.getByProyecto(proyecto.id);
      setMiembros(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron cargar los miembros del proyecto'));
    } finally {
      setLoading(false);
    }
  }, [proyecto?.id]);

  useEffect(() => {
    if (open && proyecto?.id) {
      loadMiembros();
      setSearch('');
      setSugerencias([]);
      setUsuarioSeleccionado(null);
      setRolNuevo('DESARROLLADOR');
    }
  }, [open, proyecto?.id, loadMiembros]);

  useEffect(() => {
    if (!open || search.trim().length < 2) {
      setSugerencias([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const lista = await usuariosService.buscar(search.trim());
        const idsProyecto = new Set(miembros.map((m) => Number(m.usuarioId)));
        setSugerencias(
          lista.filter(
            (u) =>
              u.id != null &&
              !idsProyecto.has(Number(u.id)) &&
              empresaIdsSet.has(Number(u.id))
          )
        );
      } catch (err) {
        toast.error(getErrorMessage(err, 'Error al buscar usuarios'));
        setSugerencias([]);
      } finally {
        setBuscando(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [search, open, miembros, empresaIdsSet]);

  const handleAdd = async () => {
    if (!usuarioSeleccionado?.id || !proyecto?.id) {
      toast.error('Selecciona un usuario que ya sea miembro de la empresa');
      return;
    }
    try {
      await miembrosProyectoService.add(proyecto.id, usuarioSeleccionado.id, rolNuevo);
      toast.success('Integrante añadido al proyecto');
      setUsuarioSeleccionado(null);
      setSearch('');
      await loadMiembros();
      onUpdated?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo añadir al proyecto'));
    }
  };

  const handleRolChange = async (miembroId, nuevoRol) => {
    try {
      await miembrosProyectoService.updateRol(proyecto.id, miembroId, nuevoRol);
      await loadMiembros();
      onUpdated?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo actualizar el rol'));
    }
  };

  const handleRemove = async (miembroId) => {
    try {
      await miembrosProyectoService.remove(proyecto.id, miembroId);
      toast.success('Integrante quitado del proyecto');
      await loadMiembros();
      onUpdated?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar'));
    }
  };

  return (
    <AnimatePresence>
      {open && proyecto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Equipo del proyecto</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{proyecto.nombre}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {canManage && (
                <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-900/40">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> Añadir del equipo de la empresa
                  </p>
                  <p className="text-xs text-slate-500">
                    Solo aparecen usuarios que ya son miembros activos de la empresa.
                  </p>
                  <input
                    type="text"
                    value={usuarioSeleccionado ? usuarioSeleccionado.email : search}
                    onChange={(e) => {
                      setUsuarioSeleccionado(null);
                      setSearch(e.target.value);
                    }}
                    placeholder="Buscar por nombre o correo..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
                  />
                  {usuarioSeleccionado && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Seleccionado: {usuarioSeleccionado.nombre} {usuarioSeleccionado.apellido}
                    </p>
                  )}
                  {!usuarioSeleccionado && sugerencias.length > 0 && (
                    <ul className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 divide-y divide-slate-100 dark:divide-slate-700">
                      {sugerencias.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white"
                            onClick={() => {
                              setUsuarioSeleccionado(u);
                              setSearch('');
                              setSugerencias([]);
                            }}
                          >
                            <span className="font-medium">{u.nombre} {u.apellido}</span>
                            <span className="block text-xs text-slate-500">{u.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {buscando && <p className="text-xs text-slate-500">Buscando…</p>}
                  {empresaIdsSet.size === 0 && (
                    <p className="text-xs text-amber-600">Carga miembros de la empresa primero.</p>
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={rolNuevo}
                      onChange={(e) => setRolNuevo(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white"
                    >
                      {ROLES_PROYECTO.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Integrantes ({miembros.length})
                </p>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : miembros.length === 0 ? (
                  <p className="text-sm text-slate-500">No hay integrantes en este proyecto.</p>
                ) : (
                  <ul className="space-y-2">
                    {miembros.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center gap-2 justify-between rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-white truncate text-sm">
                            {m.usuarioNombre || m.usuarioApodo || 'Usuario'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{m.usuarioEmail}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {canManage ? (
                            <select
                              value={m.rol || 'DESARROLLADOR'}
                              onChange={(e) => handleRolChange(m.id, e.target.value)}
                              className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 max-w-[140px]"
                            >
                              {ROLES_PROYECTO.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">{m.rol}</span>
                          )}
                          {canManage && Number(m.usuarioId) !== Number(currentUserId) && (
                            <button
                              type="button"
                              onClick={() => handleRemove(m.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                              title="Quitar del proyecto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
