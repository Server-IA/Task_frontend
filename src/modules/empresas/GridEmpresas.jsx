import PropTypes from 'prop-types';
import GenericGrid from '../../shared/generic/GenericGrid';

export default function GridEmpresas({ empresas, onRowSelect }) {
  const columns = [
    { field: 'id', headerName: 'ID', width: 80, type: 'number' },
    { field: 'nombre', headerName: 'Nombre', width: 200, type: 'string' },
    { field: 'descripcion', headerName: 'Descripción', width: 250, type: 'string' },
    { field: 'correo', headerName: 'Correo', width: 200, type: 'string' },
    { field: 'estadoNombre', headerName: 'Estado', width: 120, type: 'string' },
  ];

  return <GenericGrid data={empresas} columns={columns} onRowSelect={onRowSelect} />;
}

GridEmpresas.propTypes = {
  empresas: PropTypes.array.isRequired,
  onRowSelect: PropTypes.func.isRequired,
};

