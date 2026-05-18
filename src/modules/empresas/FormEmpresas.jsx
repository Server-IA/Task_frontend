import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { FieldError } from '@/shared/components';
import { isEmpty, isValidEmail, isValidPhone } from '@/shared/lib/formValidation';

const inputBase =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 transition-all';
const inputNormal = `${inputBase} border-slate-200 dark:border-slate-600 focus:ring-blue-500`;
const inputError = `${inputBase} border-red-400 dark:border-red-500 focus:ring-red-400`;

export default function FormEmpresas({ onClose, onSave, initialData }) {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    nit: '',
    correo: '',
    telefono: '',
    direccion: '',
    sector: '',
    pais: '',
    departamento: '',
    ciudad: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre || '',
        descripcion: initialData.descripcion || '',
        nit: initialData.nit || '',
        correo: initialData.correo || '',
        telefono: initialData.telefono || '',
        direccion: initialData.direccion || '',
        sector: initialData.sector || '',
        pais: initialData.pais || '',
        departamento: initialData.departamento || '',
        ciudad: initialData.ciudad || '',
      });
    }
  }, [initialData]);

  const validate = () => {
    const e = {};
    if (isEmpty(form.nombre)) e.nombre = 'El nombre es obligatorio';
    if (isEmpty(form.nit)) e.nit = 'El NIT es obligatorio';
    if (isEmpty(form.correo)) e.correo = 'El correo es obligatorio';
    else if (!isValidEmail(form.correo)) e.correo = 'Ingresa un correo válido';
    if (isEmpty(form.telefono)) e.telefono = 'El teléfono es obligatorio';
    else if (!isValidPhone(form.telefono)) e.telefono = 'Ingresa entre 7 y 15 dígitos';
    if (isEmpty(form.sector)) e.sector = 'El sector es obligatorio';
    if (isEmpty(form.direccion)) e.direccion = 'La dirección es obligatoria';
    if (isEmpty(form.pais)) e.pais = 'El país es obligatorio';
    if (isEmpty(form.departamento)) e.departamento = 'El departamento es obligatorio';
    if (isEmpty(form.ciudad)) e.ciudad = 'La ciudad es obligatoria';
    return e;
  };

  const handleChange = (name, value) => {
    const newValue = name === 'telefono' ? value.replace(/\D/g, '') : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    onSave(form);
  };

  const ic = (name) => (errors[name] ? inputError : inputNormal);

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
            {initialData ? 'Editar Empresa' : 'Nueva Empresa'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              className={ic('nombre')}
            />
            <FieldError message={errors.nombre} />
          </div>

          {/* NIT + Correo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                NIT <span className="text-red-500">*</span>
              </label>
              <input
                value={form.nit}
                onChange={(e) => handleChange('nit', e.target.value)}
                className={ic('nit')}
              />
              <FieldError message={errors.nit} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Correo <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => handleChange('correo', e.target.value)}
                className={ic('correo')}
              />
              <FieldError message={errors.correo} />
            </div>
          </div>

          {/* Teléfono + Sector */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                value={form.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                inputMode="numeric"
                className={ic('telefono')}
              />
              <FieldError message={errors.telefono} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sector <span className="text-red-500">*</span>
              </label>
              <input
                value={form.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className={ic('sector')}
              />
              <FieldError message={errors.sector} />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              value={form.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              className={ic('direccion')}
            />
            <FieldError message={errors.direccion} />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              rows={3}
              className={`${inputNormal} resize-none`}
            />
          </div>

          {/* Ubicación */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'pais', label: 'País' },
              { name: 'departamento', label: 'Departamento' },
              { name: 'ciudad', label: 'Ciudad' },
            ].map(({ name, label }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {label} <span className="text-red-500">*</span>
                </label>
                <input
                  value={form[name]}
                  onChange={(e) => handleChange(name, e.target.value)}
                  className={ic(name)}
                />
                <FieldError message={errors[name]} />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              <Save className="w-4 h-4" />
              {initialData ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
