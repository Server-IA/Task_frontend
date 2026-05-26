import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

/**
 * Diálogo de confirmación personalizado que reemplaza window.confirm().
 * Uso:
 *   const [confirmTarget, setConfirmTarget] = useState(null);
 *   <ConfirmDialog
 *     open={!!confirmTarget}
 *     message={`¿Eliminar "${confirmTarget?.nombre}"?`}
 *     onConfirm={() => { doDelete(confirmTarget); setConfirmTarget(null); }}
 *     onCancel={() => setConfirmTarget(null)}
 *   />
 */
export default function ConfirmDialog({
  open,
  title = '¿Estás seguro?',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700/50"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                danger
                  ? 'bg-red-50 dark:bg-red-500/10'
                  : 'bg-amber-50 dark:bg-amber-500/10'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-800 dark:text-white text-base break-words">{title}</h3>
                {message && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed break-words [overflow-wrap:anywhere]">{message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onCancel}
                className="px-4 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${
                  danger
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
