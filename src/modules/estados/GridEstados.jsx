import PropTypes from 'prop-types';
import GenericGrid from '../../shared/generic/GenericGrid';

export default function GridEstados({ estados, onRowSelect }) {
  const columns = [
    { field: 'id', headerName: 'ID', width: 80, type: 'number' },
    { field: 'nombre', headerName: 'Nombre', width: 200, type: 'string' },
    { field: 'descripcion', headerName: 'Descripción', width: 400, type: 'string' },
  ];

  return <GenericGrid data={estados} columns={columns} onRowSelect={onRowSelect} />;
}

GridEstados.propTypes = {
  estados: PropTypes.array.isRequired,
  onRowSelect: PropTypes.func.isRequired,
};

