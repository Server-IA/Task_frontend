import PropTypes from 'prop-types';
import GenericForm from '../../shared/generic/GenericForm';

export default function FormEmpresas({ open, onClose, mode, initialData, onSubmit, estados }) {
  const fields = [
    { name: 'nombre', label: 'Nombre de la Empresa', type: 'text', required: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', required: false },
    { name: 'correo', label: 'Correo Electrónico', type: 'email', required: true },
    { name: 'estadoId', label: 'Estado', type: 'select', required: true, options: estados },
  ];

  return (
    <GenericForm
      open={open}
      onClose={onClose}
      title="Empresa"
      fields={fields}
      initialData={initialData}
      onSubmit={onSubmit}
      mode={mode}
    />
  );
}

FormEmpresas.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['create', 'edit']).isRequired,
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  estados: PropTypes.array.isRequired,
};

