import PropTypes from 'prop-types';
import GenericGrid from '../../shared/generic/GenericGrid';

export default function GridSubsistemas({ subsistemas, onRowSelect }) {
  const columns = [
    { field: 'id', headerName: 'ID', width: 80, type: 'number' },
    { field: 'nombre', headerName: 'Nombre', width: 200, type: 'string' },
    { field: 'descripcion', headerName: 'Descripción', width: 250, type: 'string' },
    { field: 'sistemaNombre', headerName: 'Sistema', width: 180, type: 'string' },
    { field: 'estadoNombre', headerName: 'Estado', width: 120, type: 'string' },
  ];

  return <GenericGrid data={subsistemas} columns={columns} onRowSelect={onRowSelect} />;
}

GridSubsistemas.propTypes = {
  subsistemas: PropTypes.array.isRequired,
  onRowSelect: PropTypes.func.isRequired,
};

