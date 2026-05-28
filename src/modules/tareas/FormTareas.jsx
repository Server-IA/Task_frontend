import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { SelectField, DateInput, FieldError } from '@/shared/components';
import { miembrosProyectoService } from '@/shared/services';
import { isEmpty } from '@/shared/lib/formValidation';
import { getTomorrowInputDate, toInputDateValue } from '@/shared/lib/dateUtils';
import { formatRoleLabel } from '@/shared/lib/roleUtils';
import { useAuth } from '@/context/AuthContext';

function labelMiembro(m) {
  const nombre = m.usuarioNombre?.trim() || m.usuarioApodo?.trim();
  const rolLabel = formatRoleLabel(m.rol);
  const base = nombre || m.usuarioEmail || `Usuario #${m.usuarioId}`;
  return rolLabel ? `${base} — ${rolLabel}` : base;
}

const inputBase =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700/50 border rounded-xl text-slate-800 dark:text-white focus:outline-none focus:ring-2 transition-all';
const inputNormal = `${inputBase} border-slate-200 dark:border-slate-600 focus:ring-blue-500`;
const inputError = `${inputBase} border-red-400 dark:border-red-500 focus:ring-red-400`;

export default function FormTareas({ onClose, onSave, initialData, proyectos, estados }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'MEDIA',
    fechaLimite: '',
    proyectoId: '',
    estadoId: '',
    asignadoId: '',
    orden: 0,
  });
  const [errors, setErrors] = useState({});
  const [miembrosProyecto, setMiembrosProyecto] = useState([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  const isLimitedEditor = !!(
    initialData &&
    user?.id &&
    Number(initialData.asignadoId) === Number(user.id) &&
    Number(initialData.creadorId) !== Number(user.id)
  );

  useEffect(() => {
    if (initialData) {
      setForm({
        titulo: initialData.titulo || '',
        descripcion: initialData.descripcion || '',
        prioridad: initialData.prioridad || 'MEDIA',
        fechaLimite: toInputDateValue(initialData.fechaLimite),
        proyectoId: initialData.proyectoId ? String(initialData.proyectoId) : '',
        estadoId: initialData.estadoId ? String(initialData.estadoId) : '',
        asignadoId: initialData.asignadoId ? String(initialData.asignadoId) : '',
        orden: initialData.orden || 0,
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (!form.proyectoId) {
      setMiembrosProyecto([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setCargandoMiembros(true);
      try {
        const lista = await miembrosProyectoService.getByProyecto(form.proyectoId);
        if (!cancelled) setMiembrosProyecto(lista);
      } catch {
        if (!cancelled) setMiembrosProyecto([]);
      } finally {
        if (!cancelled) setCargandoMiembros(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.proyectoId]);

  const minDate = initialData ? undefined : getTomorrowInputDate();

  const validate = () => {
    const e = {};
    if (isEmpty(form.titulo)) e.titulo = 'El título es obligatorio';
    else if (form.titulo.length > 300) e.titulo = 'El título no puede superar los 300 caracteres';
    if (isEmpty(form.proyectoId)) e.proyectoId = 'Selecciona un proyecto';
    if (isEmpty(form.estadoId)) e.estadoId = 'Selecciona un estado';
    if (isEmpty(form.fechaLimite)) e.fechaLimite = 'La fecha límite es obligatoria';
    return e;
  };

  const set = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'proyectoId' && value !== prev.proyectoId) {
        next.asignadoId = '';
      }
      return next;
    });
    if (errors[name]) setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) { setErrors(validation); return; }
    onSave({
      ...form,
      orden: Number(form.orden),
      proyectoId: form.proyectoId ? Number(form.proyectoId) : null,
      estadoId: form.estadoId ? Number(form.estadoId) : null,
      asignadoId: form.asignadoId ? Number(form.asignadoId) : null,
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
            {isLimitedEditor ? 'Actualizar estado' : initialData ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {isLimitedEditor && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              Solo puedes cambiar el estado de la tarea.
            </div>
          )}

          {!isLimitedEditor && (
            <>
              {/* Título */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-xs ${form.titulo.length > 280 ? (form.titulo.length >= 300 ? 'text-red-500' : 'text-amber-500') : 'text-slate-400'}`}>
                    {form.titulo.length}/300
                  </span>
                </div>
                <input
                  value={form.titulo}
                  onChange={(e) => set('titulo', e.target.value)}
                  maxLength={300}
                  className={ic('titulo')}
                />
                <FieldError message={errors.titulo} />
              </div>

              {/* Descripción */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                  <span className={`text-xs ${form.descripcion.length > 4500 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {form.descripcion.length}/5000
                  </span>
                </div>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => set('descripcion', e.target.value)}
                  rows={3}
                  maxLength={5000}
                  className={`${inputNormal} resize-none`}
                />
              </div>

              {/* Proyecto + Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Proyecto <span className="text-red-500">*</span>
                  </label>
                  <SelectField value={form.proyectoId} onChange={(e) => set('proyectoId', e.target.value)} error={!!errors.proyectoId}>
                    <option value="">Seleccionar...</option>
                    {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </SelectField>
                  <FieldError message={errors.proyectoId} />
                </div>
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
              </div>

              {/* Asignado */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Asignado a
                </label>
                <SelectField
                  value={form.asignadoId}
                  onChange={(e) => set('asignadoId', e.target.value)}
                  disabled={!form.proyectoId || cargandoMiembros}
                >
                  <option value="">
                    {!form.proyectoId
                      ? 'Selecciona un proyecto primero'
                      : cargandoMiembros
                        ? 'Cargando equipo...'
                        : 'Sin asignar'}
                  </option>
                  {miembrosProyecto.map((m) => (
                    <option key={m.usuarioId} value={m.usuarioId}>
                      {labelMiembro(m)}
                    </option>
                  ))}
                </SelectField>
                {form.proyectoId && !cargandoMiembros && miembrosProyecto.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No hay integrantes en este proyecto. Añádelos en Proyectos → Equipo.
                  </p>
                )}
              </div>

              {/* Prioridad + Fecha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prioridad</label>
                  <SelectField value={form.prioridad} onChange={(e) => set('prioridad', e.target.value)}>
                    <option value="BAJA">Baja</option>
                    <option value="MEDIA">Media</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </SelectField>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha límite <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    value={form.fechaLimite}
                    onChange={(e) => set('fechaLimite', e.target.value)}
                    min={minDate}
                    error={!!errors.fechaLimite}
                    required
                  />
                  <FieldError message={errors.fechaLimite} />
                </div>
              </div>
            </>
          )}

          {isLimitedEditor && (
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
          )}

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
