import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';

export default function FormTareas({ onClose, onSave, initialData, proyectos, estados }) {
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA',
    fechaLimite: '',
    proyectoId: '',
    estadoId: '',
    orden: 0,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        titulo: initialData.titulo || '',
        descripcion: initialData.descripcion || '',
        prioridad: initialData.prioridad || 'MEDIA',
        fechaLimite: initialData.fechaLimite || '',
        proyectoId: initialData.proyectoId || '',
        estadoId: initialData.estadoId || '',
        orden: initialData.orden || 0,
      });
    }
  }, [initialData]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      orden: Number(form.orden),
      proyectoId: form.proyectoId || null,
      estadoId: form.estadoId || null,
    });
  };

  const inputClass = 'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all';

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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {initialData ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proyecto <span className="text-red-500">*</span></label>
              <select required value={form.proyectoId} onChange={(e) => setForm({ ...form, proyectoId: e.target.value })} className={inputClass}>
                <option value="">Seleccionar...</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
              <select value={form.estadoId} onChange={(e) => setForm({ ...form, estadoId: e.target.value })} className={inputClass}>
                <option value="">Seleccionar...</option>
                {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridad</label>
              <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className={inputClass}>
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha límite</label>
              <input type="date" min={minDate} value={form.fechaLimite} onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
              <Save className="w-4 h-4" />
              {initialData ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
