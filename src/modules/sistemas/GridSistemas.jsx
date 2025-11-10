import PropTypes from 'prop-types';
import GenericGrid from '../../shared/generic/GenericGrid';

export default function GridSistemas({ sistemas, onRowSelect }) {
  const columns = [
    { field: 'id', headerName: 'ID', width: 80, type: 'number' },
    { field: 'nombre', headerName: 'Nombre', width: 200, type: 'string' },
    { field: 'descripcion', headerName: 'Descripción', width: 350, type: 'string' },
    { field: 'estadoNombre', headerName: 'Estado', width: 120, type: 'string' },
  ];

  return <GenericGrid data={sistemas} columns={columns} onRowSelect={onRowSelect} />;
}

GridSistemas.propTypes = {
  sistemas: PropTypes.array.isRequired,
  onRowSelect: PropTypes.func.isRequired,
};

