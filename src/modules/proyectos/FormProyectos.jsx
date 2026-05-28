import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { SelectField, DateInput, FieldError } from '@/shared/components';
import { isEmpty } from '@/shared/lib/formValidation';
import { getTomorrowInputDate, toInputDateValue } from '@/shared/lib/dateUtils';

const inputBase =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 transition-all';
const inputNormal = `${inputBase} border-slate-200 dark:border-slate-600 focus:ring-blue-500`;
const inputError = `${inputBase} border-red-400 dark:border-red-500 focus:ring-red-400`;

export default function FormProyectos({ onClose, onSave, initialData, empresas, tiposProyecto, estados }) {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    prioridad: 'MEDIA',
    fechaInicio: '',
    fechaFinEstimada: '',
    empresaId: '',
    tipoProyectoId: '',
    estadoId: '',
    progreso: 0,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        nombre: initialData.nombre || '',
        descripcion: initialData.descripcion || '',
        prioridad: initialData.prioridad || 'MEDIA',
        fechaInicio: toInputDateValue(initialData.fechaInicio),
        fechaFinEstimada: toInputDateValue(initialData.fechaFinEstimada),
        empresaId: initialData.empresaId || '',
        tipoProyectoId: initialData.tipoProyectoId || '',
        estadoId: initialData.estadoId || '',
        progreso: initialData.progreso || 0,
      });
    } else {
      setForm({
        nombre: '', descripcion: '', prioridad: 'MEDIA',
        fechaInicio: '', fechaFinEstimada: '', empresaId: '',
        tipoProyectoId: '', estadoId: '', progreso: 0,
      });
      setErrors({});
    }
  }, [initialData]);

  const minDate = initialData ? undefined : getTomorrowInputDate();

  const validate = () => {
    const e = {};
    if (isEmpty(form.nombre)) e.nombre = 'El nombre es obligatorio';
    if (isEmpty(form.empresaId)) e.empresaId = 'Selecciona una empresa';
    if (isEmpty(form.tipoProyectoId)) e.tipoProyectoId = 'Selecciona un tipo de proyecto';
    if (isEmpty(form.estadoId)) e.estadoId = 'Selecciona un estado';
    if (isEmpty(form.fechaInicio)) e.fechaInicio = 'La fecha de inicio es obligatoria';
    const progresoNum = Number(form.progreso);
    if (!Number.isInteger(progresoNum) || progresoNum < 0 || progresoNum > 100) {
      e.progreso = 'El progreso debe ser un número entero entre 0 y 100';
    }
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
    onSave({
      ...form,
      progreso: Number(form.progreso),
      empresaId: form.empresaId || null,
      tipoProyectoId: form.tipoProyectoId || null,
      estadoId: form.estadoId || null,
    });
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
            {initialData ? 'Editar Proyecto' : 'Nuevo Proyecto'}
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
            <input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className={ic('nombre')} />
            <FieldError message={errors.nombre} />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={3}
              className={`${inputNormal} resize-none`}
            />
          </div>

          {/* Empresa + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Empresa <span className="text-red-500">*</span>
              </label>
              <SelectField value={form.empresaId} onChange={(e) => set('empresaId', e.target.value)} error={!!errors.empresaId}>
                <option value="">Seleccionar...</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </SelectField>
              <FieldError message={errors.empresaId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <SelectField value={form.tipoProyectoId} onChange={(e) => set('tipoProyectoId', e.target.value)} error={!!errors.tipoProyectoId}>
                <option value="">Seleccionar...</option>
                {tiposProyecto.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </SelectField>
              <FieldError message={errors.tipoProyectoId} />
            </div>
          </div>

          {/* Estado + Prioridad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <SelectField value={form.estadoId} onChange={(e) => set('estadoId', e.target.value)} error={!!errors.estadoId}>
                <option value="">Seleccionar...</option>
                {estados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </SelectField>
              <FieldError message={errors.estadoId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridad</label>
              <SelectField value={form.prioridad} onChange={(e) => set('prioridad', e.target.value)}>
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </SelectField>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              <DateInput
                value={form.fechaInicio}
                onChange={(e) => set('fechaInicio', e.target.value)}
                error={!!errors.fechaInicio}
                required
              />
              <FieldError message={errors.fechaInicio} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha fin estimada</label>
              <DateInput
                value={form.fechaFinEstimada}
                onChange={(e) => set('fechaFinEstimada', e.target.value)}
                min={minDate}
              />
            </div>
          </div>

          {/* Progreso */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Progreso (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.progreso}
              onChange={(e) => set('progreso', e.target.value)}
              className={errors.progreso ? inputError : inputNormal}
            />
            <FieldError message={errors.progreso} />
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
