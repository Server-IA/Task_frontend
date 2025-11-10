import PropTypes from 'prop-types';
import GenericForm from '../../shared/generic/GenericForm';

export default function FormEstados({ open, onClose, mode, initialData, onSubmit }) {
  const fields = [
    { name: 'nombre', label: 'Nombre del Estado', type: 'text', required: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', required: false },
  ];

  return (
    <GenericForm
      open={open}
      onClose={onClose}
      title="Estado"
      fields={fields}
      initialData={initialData}
      onSubmit={onSubmit}
      mode={mode}
    />
  );
}

FormEstados.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['create', 'edit']).isRequired,
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
};

