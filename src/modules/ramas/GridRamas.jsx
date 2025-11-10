import PropTypes from 'prop-types';
import GenericGrid from '../../shared/generic/GenericGrid';

export default function GridRamas({ ramas, onRowSelect }) {
  const columns = [
    { field: 'id', headerName: 'ID', width: 80, type: 'number' },
    { field: 'nombre', headerName: 'Nombre', width: 250, type: 'string' },
    { field: 'descripcion', headerName: 'Descripción', width: 400, type: 'string' },
  ];

  return <GenericGrid data={ramas} columns={columns} onRowSelect={onRowSelect} />;
}

GridRamas.propTypes = {
  ramas: PropTypes.array.isRequired,
  onRowSelect: PropTypes.func.isRequired,
};

