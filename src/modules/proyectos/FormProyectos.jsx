/**
 * @file FormProyectos.jsx
 * @description Formulario específico para proyectos
 */

import PropTypes from 'prop-types';
import GenericForm from '../../shared/generic/GenericForm';

export default function FormProyectos({
  open,
  onClose,
  mode,
  initialData,
  onSubmit,
  empresas,
  tiposProyecto,
  estados,
}) {
  // Definición de campos del formulario
  const fields = [
    {
      name: 'nombre',
      label: 'Nombre del Proyecto',
      type: 'text',
      required: true,
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: false,
    },
    {
      name: 'empresaId',
      label: 'Empresa',
      type: 'select',
      required: true,
      options: empresas,
    },
    {
      name: 'tipoProyectoId',
      label: 'Tipo de Proyecto',
      type: 'select',
      required: true,
      options: tiposProyecto,
    },
    {
      name: 'estadoId',
      label: 'Estado',
      type: 'select',
      required: true,
      options: estados,
    },
  ];

  return (
    <GenericForm
      open={open}
      onClose={onClose}
      title="Proyecto"
      fields={fields}
      initialData={initialData}
      onSubmit={onSubmit}
      mode={mode}
    />
  );
}

FormProyectos.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(['create', 'edit']).isRequired,
  initialData: PropTypes.object,
  onSubmit: PropTypes.func.isRequired,
  empresas: PropTypes.array.isRequired,
  tiposProyecto: PropTypes.array.isRequired,
  estados: PropTypes.array.isRequired,
};

