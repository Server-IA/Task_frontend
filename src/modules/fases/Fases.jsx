import { useState, useEffect } from 'react';
import GridFases from './GridFases';
import FormFases from './FormFases';
import { mockFases, mockEstados, simulateDelay } from '../../shared/config/mockData';

export default function Fases() {
  const [fases, setFases] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [estados] = useState(mockEstados);

  useEffect(() => {
    loadFases();
  }, []);

  const loadFases = async () => {
    setLoading(true);
    await simulateDelay(300);
    const enrichedData = mockFases.map(fase => ({
      ...fase,
      estadoNombre: estados.find(e => e.id === fase.estadoId)?.nombre || 'N/A',
    }));
    setFases(enrichedData);
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
    if (!window.confirm(`¿Eliminar la fase "${selectedRow.nombre}"?`)) return;
    await simulateDelay(300);
    setFases(fases.filter(f => f.id !== selectedRow.id));
    setSelectedRow(null);
    alert('Fase eliminada correctamente');
  };

  const handleFormSubmit = async (data) => {
    await simulateDelay(300);
    if (formMode === 'create') {
      const newFase = {
        ...data,
        id: Math.max(...fases.map(f => f.id), 0) + 1,
        estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      setFases([...fases, newFase]);
      alert('Fase creada correctamente');
    } else {
      const updatedFases = fases.map(f =>
        f.id === selectedRow.id
          ? { ...data, id: f.id, estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A' }
          : f
      );
      setFases(updatedFases);
      setSelectedRow(null);
      alert('Fase actualizada correctamente');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Fases</h1>
        <p className="text-gray-600 mt-2">Administra las fases del sistema</p>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <span>➕</span> Crear Fase
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
        <GridFases fases={fases} onRowSelect={setSelectedRow} />
      )}

      <FormFases
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

