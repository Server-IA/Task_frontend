/**
 * @file GenericGrid.jsx
 * @description Componente de tabla genérica reutilizable
 * Muestra datos en formato de tabla con selección de filas
 */

import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Componente de Grid genérico con paginación y selección
 * @param {Object} props
 * @param {Array} props.data - Datos a mostrar en la tabla
 * @param {Array} props.columns - Definición de columnas [{field, headerName, width, type}]
 * @param {Function} props.onRowSelect - Callback cuando se selecciona una fila
 * @returns {JSX.Element}
 */
export default function GenericGrid({ data = [], columns = [], onRowSelect }) {
  const [selectedId, setSelectedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Cálculos de paginación
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = data.slice(startIndex, endIndex);

  /**
   * Maneja la selección de una fila
   */
  const handleRowClick = (row) => {
    setSelectedId(row.id);
    if (onRowSelect) {
      onRowSelect(row);
    }
  };

  /**
   * Renderiza el valor de una celda según su tipo
   */
  const renderCellValue = (row, column) => {
    let value = row[column.field];
    
    if (value === null || value === undefined) {
      return '-';
    }

    // Formateo según tipo de columna
    switch (column.type) {
      case 'boolean':
        return value ? '✓' : '✗';
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  };

  return (
    <div className="w-full">
      {/* Tabla */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* Header */}
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.field}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: column.width ? `${column.width}px` : 'auto' }}
                  >
                    {column.headerName}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No hay datos disponibles
                  </td>
                </tr>
              ) : (
                currentData.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row)}
                    className={`cursor-pointer transition-colors ${
                      selectedId === row.id
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {columns.map((column) => (
                      <td
                        key={`${row.id}-${column.field}`}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {renderCellValue(row, column)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            {/* Info */}
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>

            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              {/* Selector de tamaño de página */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, data.length)} de {data.length} resultados
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(0);
                  }}
                  className="border border-gray-300 rounded-md text-sm py-1 px-2"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={20}>20 por página</option>
                  <option value={50}>50 por página</option>
                </select>
              </div>

              {/* Controles de página */}
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    ‹
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                        currentPage === index
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    ›
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

GenericGrid.propTypes = {
  data: PropTypes.array.isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      headerName: PropTypes.string.isRequired,
      width: PropTypes.number,
      type: PropTypes.string,
    })
  ).isRequired,
  onRowSelect: PropTypes.func,
};

