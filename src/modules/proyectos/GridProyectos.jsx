/**
 * @file GridProyectos.jsx
 * @description Grid específico para mostrar proyectos
 */

import PropTypes from 'prop-types';
import GenericGrid from '../../shared/generic/GenericGrid';

export default function GridProyectos({ proyectos, onRowSelect }) {
  // Definición de columnas para proyectos
  const columns = [
    { field: 'id', headerName: 'ID', width: 80, type: 'number' },
    { field: 'nombre', headerName: 'Nombre', width: 200, type: 'string' },
    { field: 'descripcion', headerName: 'Descripción', width: 250, type: 'string' },
    { field: 'empresaNombre', headerName: 'Empresa', width: 180, type: 'string' },
    { field: 'tipoProyectoNombre', headerName: 'Tipo', width: 150, type: 'string' },
    { field: 'estadoNombre', headerName: 'Estado', width: 120, type: 'string' },
  ];

  return (
    <GenericGrid
      data={proyectos}
      columns={columns}
      onRowSelect={onRowSelect}
    />
  );
}

GridProyectos.propTypes = {
  proyectos: PropTypes.array.isRequired,
  onRowSelect: PropTypes.func.isRequired,
};

