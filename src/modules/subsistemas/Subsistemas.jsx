import { useState, useEffect } from 'react';
import GridSubsistemas from './GridSubsistemas';
import FormSubsistemas from './FormSubsistemas';
import { mockSubsistemas, mockSistemas, mockEstados, simulateDelay } from '../../shared/config/mockData';

export default function Subsistemas() {
  const [subsistemas, setSubsistemas] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [sistemas] = useState(mockSistemas);
  const [estados] = useState(mockEstados);

  useEffect(() => {
    loadSubsistemas();
  }, []);

  const loadSubsistemas = async () => {
    setLoading(true);
    await simulateDelay(300);
    const enrichedData = mockSubsistemas.map(subsistema => ({
      ...subsistema,
      sistemaNombre: sistemas.find(s => s.id === subsistema.sistemaId)?.nombre || 'N/A',
      estadoNombre: estados.find(e => e.id === subsistema.estadoId)?.nombre || 'N/A',
    }));
    setSubsistemas(enrichedData);
    setLoading(false);
  };

  const handleCreate = () => {
    setFormMode('create');
    setSelectedRow(null);
    setFormOpen(true);
  };

  const handleEdit = () => {
    if (!selectedRow) return;
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRow) return;
    if (!window.confirm(`¿Eliminar el subsistema "${selectedRow.nombre}"?`)) return;
    await simulateDelay(300);
    setSubsistemas(subsistemas.filter(s => s.id !== selectedRow.id));
    setSelectedRow(null);
    alert('Subsistema eliminado correctamente');
  };

  const handleFormSubmit = async (data) => {
    await simulateDelay(300);
    if (formMode === 'create') {
      const newSubsistema = {
        ...data,
        id: Math.max(...subsistemas.map(s => s.id), 0) + 1,
        sistemaNombre: sistemas.find(s => s.id === Number(data.sistemaId))?.nombre || 'N/A',
        estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      setSubsistemas([...subsistemas, newSubsistema]);
      alert('Subsistema creado correctamente');
    } else {
      const updatedSubsistemas = subsistemas.map(s =>
        s.id === selectedRow.id
          ? {
              ...data,
              id: s.id,
              sistemaNombre: sistemas.find(sys => sys.id === Number(data.sistemaId))?.nombre || 'N/A',
              estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
            }
          : s
      );
      setSubsistemas(updatedSubsistemas);
      setSelectedRow(null);
      alert('Subsistema actualizado correctamente');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Subsistemas</h1>
        <p className="text-gray-600 mt-2">Administra los subsistemas del proyecto</p>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <span>➕</span> Crear Subsistema
        </button>
        <button onClick={handleEdit} disabled={!selectedRow} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span>✏️</span> Editar
        </button>
        <button onClick={handleDelete} disabled={!selectedRow} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span>🗑️</span> Eliminar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      ) : (
        <GridSubsistemas subsistemas={subsistemas} onRowSelect={setSelectedRow} />
      )}

      <FormSubsistemas
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        initialData={selectedRow}
        onSubmit={handleFormSubmit}
        sistemas={sistemas}
        estados={estados}
      />
    </div>
  );
}

