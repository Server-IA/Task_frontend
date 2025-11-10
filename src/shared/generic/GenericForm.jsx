/**
 * @file GenericForm.jsx
 * @description Componente de formulario modal genérico reutilizable
 * Soporta creación y edición de entidades
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Componente de formulario modal genérico
 * @param {Object} props
 * @param {boolean} props.open - Si el modal está abierto
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {string} props.title - Título del modal
 * @param {Array} props.fields - Definición de campos [{name, label, type, required, options}]
 * @param {Object} props.initialData - Datos iniciales para edición
 * @param {Function} props.onSubmit - Callback al enviar el formulario
 * @param {string} props.mode - Modo del formulario: 'create' o 'edit'
 * @returns {JSX.Element}
 */
export default function GenericForm({
  open,
  onClose,
  title,
  fields = [],
  initialData = {},
  onSubmit,
  mode = 'create',
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Inicializar datos del formulario
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialData) {
        setFormData(initialData);
      } else {
        // Inicializar con valores vacíos
        const emptyData = {};
        fields.forEach(field => {
          emptyData[field.name] = '';
        });
        setFormData(emptyData);
      }
      setErrors({});
    }
  }, [open, mode, initialData, fields]);

  /**
   * Maneja el cambio en los campos del formulario
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  /**
   * Valida el formulario
   */
  const validate = () => {
    const newErrors = {};
    
    fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} es requerido`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      onSubmit(formData);
      onClose();
    }
  };

  /**
   * Renderiza un campo según su tipo
   */
  const renderField = (field) => {
    const commonProps = {
      name: field.name,
      value: formData[field.name] || '',
      onChange: handleChange,
      className: `mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
        errors[field.name] ? 'border-red-500' : 'border-gray-300'
      }`,
    };

    switch (field.type) {
      case 'select':
        return (
          <select {...commonProps} className={`${commonProps.className} px-3 py-2 border`}>
            <option value="">Seleccione...</option>
            {field.options?.map(option => (
              <option key={option.id} value={option.id}>
                {option.nombre}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            className={`${commonProps.className} px-3 py-2 border`}
          />
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            name={field.name}
            checked={formData[field.name] || false}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            className={`${commonProps.className} px-3 py-2 border`}
          />
        );

      case 'email':
        return (
          <input
            {...commonProps}
            type="email"
            className={`${commonProps.className} px-3 py-2 border`}
          />
        );

      default:
        return (
          <input
            {...commonProps}
            type="text"
            className={`${commonProps.className} px-3 py-2 border`}
          />
        );
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? `Crear ${title}` : `Editar ${title}`}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {fields.map(field => (
                <div key={field.name}>
                  <label
                    htmlFor={field.name}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderField(field)}
                  {errors[field.name] && (
                    <p className="mt-1 text-sm text-red-600">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                {mode === 'create' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

GenericForm.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string,
      required: PropTypes.bool,
      options: PropTypes.array,
    })
  ).isRequired,
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['create', 'edit']),
};

