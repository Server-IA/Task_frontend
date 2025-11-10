import { useState, useEffect } from 'react';
import GridSistemas from './GridSistemas';
import FormSistemas from './FormSistemas';
import { mockSistemas, mockEstados, simulateDelay } from '../../shared/config/mockData';

export default function Sistemas() {
  const [sistemas, setSistemas] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [estados] = useState(mockEstados);

  useEffect(() => {
    loadSistemas();
  }, []);

  const loadSistemas = async () => {
    setLoading(true);
    await simulateDelay(300);
    const enrichedData = mockSistemas.map(sistema => ({
      ...sistema,
      estadoNombre: estados.find(e => e.id === sistema.estadoId)?.nombre || 'N/A',
    }));
    setSistemas(enrichedData);
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
    if (!window.confirm(`¿Eliminar el sistema "${selectedRow.nombre}"?`)) return;
    await simulateDelay(300);
    setSistemas(sistemas.filter(s => s.id !== selectedRow.id));
    setSelectedRow(null);
    alert('Sistema eliminado correctamente');
  };

  const handleFormSubmit = async (data) => {
    await simulateDelay(300);
    if (formMode === 'create') {
      const newSistema = {
        ...data,
        id: Math.max(...sistemas.map(s => s.id), 0) + 1,
        estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      setSistemas([...sistemas, newSistema]);
      alert('Sistema creado correctamente');
    } else {
      const updatedSistemas = sistemas.map(s =>
        s.id === selectedRow.id
          ? { ...data, id: s.id, estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A' }
          : s
      );
      setSistemas(updatedSistemas);
      setSelectedRow(null);
      alert('Sistema actualizado correctamente');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Sistemas</h1>
        <p className="text-gray-600 mt-2">Administra los sistemas del proyecto</p>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <span>➕</span> Crear Sistema
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
        <GridSistemas sistemas={sistemas} onRowSelect={setSelectedRow} />
      )}

      <FormSistemas
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        initialData={selectedRow}
        onSubmit={handleFormSubmit}
        estados={estados}
      />
    </div>
  );
}

