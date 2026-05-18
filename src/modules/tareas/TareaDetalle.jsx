import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Pencil, Clock, User, FolderKanban, Send, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { comentariosService } from '@/shared/services';
import { getErrorMessage } from '@/shared/lib/errorUtils';
import { ConfirmDialog } from '@/shared/components';
import { useAuth } from '@/context/AuthContext';

const parseServerDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && !(/[zZ]|[+-]\d{2}:\d{2}$/.test(value))) {
    return new Date(`${value}Z`);
  }
  return new Date(value);
};

const formatDateTime = (value) => {
  const date = parseServerDate(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

export default function TareaDetalle({ tarea, estados = [], onClose, onEdit, onRefresh }) {
  const { user } = useAuth();
  const isLimitedEditor = !!(
    user?.id &&
    Number(tarea.asignadoId) === Number(user.id) &&
    Number(tarea.creadorId) !== Number(user.id)
  );
  const [comentarios, setComentarios] = useState([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [loadingComentarios, setLoadingComentarios] = useState(true);
  const [confirmComentarioId, setConfirmComentarioId] = useState(null);

  useEffect(() => {
    loadComentarios();
  }, [tarea.id]);

  const loadComentarios = async () => {
    try {
      const data = await comentariosService.getByTarea(tarea.id);
      setComentarios(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al cargar los comentarios'));
    } finally {
      setLoadingComentarios(false);
    }
  };

  const handleAddComentario = async (e) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    try {
      await comentariosService.create(tarea.id, nuevoComentario);
      setNuevoComentario('');
      loadComentarios();
      toast.success('Comentario agregado');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al agregar el comentario'));
    }
  };

  const handleDeleteComentario = (comentarioId) => setConfirmComentarioId(comentarioId);

  const doDeleteComentario = async () => {
    try {
      await comentariosService.delete(tarea.id, confirmComentarioId);
      loadComentarios();
      toast.success('Comentario eliminado');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error al eliminar el comentario'));
    } finally {
      setConfirmComentarioId(null);
    }
  };

  const priorityColor = (p) => {
    if (p === 'CRITICA' || p === 'ALTA') return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400';
    if (p === 'MEDIA') return 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400';
    return 'bg-slate-100 dark:bg-slate-600/50 text-slate-600 dark:text-slate-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white truncate pr-4">{tarea.titulo}</h2>
          <div className="flex items-center gap-2 shrink-0">
            {isLimitedEditor ? (
              <button
                onClick={() => onEdit(tarea)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Cambiar estado
              </button>
            ) : (
              <button
                onClick={() => onEdit(tarea)}
                title="Editar tarea"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Info */}
          <div className="flex flex-wrap gap-2">
            {tarea.prioridad && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${priorityColor(tarea.prioridad)}`}>
                {tarea.prioridad}
              </span>
            )}
            {tarea.estadoNombre && (() => {
              const color = estados.find((e) => e.id === tarea.estadoId)?.color || '#6366f1';
              return (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: color + '22', color }}
                >
                  {tarea.estadoNombre}
                </span>
              );
            })()}
          </div>

          {tarea.descripcion && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Descripción</h3>
              <p className="text-slate-800 dark:text-white text-sm whitespace-pre-wrap">{tarea.descripcion}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {tarea.proyectoNombre && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <FolderKanban className="w-4 h-4" />
                <span>{tarea.proyectoNombre}</span>
              </div>
            )}
            {tarea.asignadoNombre && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4" />
                <span>{tarea.asignadoNombre}</span>
              </div>
            )}
            {tarea.fechaLimite && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>{new Date(tarea.fechaLimite).toLocaleDateString()}</span>
              </div>
            )}
            {tarea.creadorNombre && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4" />
                <span>Creador: {tarea.creadorNombre}</span>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
              Comentarios ({comentarios.length})
            </h3>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {loadingComentarios ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comentarios.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin comentarios</p>
              ) : (
                comentarios.map((c) => (
                  <div key={c.id} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-3 group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {c.autorNombre || c.autorApodo || 'Usuario'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {formatDateTime(c.fechaCreacion)}
                        </span>
                        {user?.id && Number(c.autorId) === Number(user.id) && (
                          <button
                            onClick={() => handleDeleteComentario(c.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{c.contenido}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComentario} className="flex gap-2">
              <input
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={!nuevoComentario.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={!!confirmComentarioId}
        title="Eliminar comentario"
        message="¿Estás seguro de que quieres eliminar este comentario?"
        confirmLabel="Eliminar"
        onConfirm={doDeleteComentario}
        onCancel={() => setConfirmComentarioId(null)}
      />
    </motion.div>
  );
}
