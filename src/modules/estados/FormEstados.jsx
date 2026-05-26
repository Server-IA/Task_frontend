import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { FieldError, ColorPicker } from '@/shared/components';
import { isEmpty } from '@/shared/lib/formValidation';

const inputBase =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 transition-all';
const inputNormal = `${inputBase} border-slate-200 dark:border-slate-600 focus:ring-blue-500`;
const inputError = `${inputBase} border-red-400 dark:border-red-500 focus:ring-red-400`;

export default function FormEstados({ onClose, onSave, initialData }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', color: '#6366f1' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre || '',
        descripcion: initialData.descripcion || '',
        color: initialData.color || '#6366f1',
      });
    } else {
      setForm({ nombre: '', descripcion: '', color: '#6366f1' });
      setErrors({});
    }
  }, [initialData]);

  const validate = () => {
    const e = {};
    if (isEmpty(form.nombre)) e.nombre = 'El nombre es obligatorio';
    return e;
  };

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }
    onSave(form);
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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {initialData ? 'Editar Estado' : 'Nuevo Estado'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              className={errors.nombre ? inputError : inputNormal}
            />
            <FieldError message={errors.nombre} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={2}
              className={`${inputNormal} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
            <ColorPicker value={form.color} onChange={(color) => set('color', color)} />
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
