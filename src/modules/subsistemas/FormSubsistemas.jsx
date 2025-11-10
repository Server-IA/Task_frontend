import PropTypes from 'prop-types';
import GenericForm from '../../shared/generic/GenericForm';

export default function FormSubsistemas({ open, onClose, mode, initialData, onSubmit, sistemas, estados }) {
  const fields = [
    { name: 'nombre', label: 'Nombre del Subsistema', type: 'text', required: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', required: false },
    { name: 'sistemaId', label: 'Sistema', type: 'select', required: true, options: sistemas },
    { name: 'estadoId', label: 'Estado', type: 'select', required: true, options: estados },
  ];

  return (
    <GenericForm
      open={open}
      onClose={onClose}
      title="Subsistema"
      fields={fields}
      initialData={initialData}
      onSubmit={onSubmit}
      mode={mode}
    />
  );
}

FormSubsistemas.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['create', 'edit']).isRequired,
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  sistemas: PropTypes.array.isRequired,
  estados: PropTypes.array.isRequired,
};

