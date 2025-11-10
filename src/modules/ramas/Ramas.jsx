import { useState, useEffect } from 'react';
import GridRamas from './GridRamas';
import FormRamas from './FormRamas';
import { mockRamas, simulateDelay } from '../../shared/config/mockData';

export default function Ramas() {
  const [ramas, setRamas] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRamas();
  }, []);

  const loadRamas = async () => {
    setLoading(true);
    await simulateDelay(300);
    setRamas(mockRamas);
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
    if (!window.confirm(`¿Eliminar la rama "${selectedRow.nombre}"?`)) return;
    await simulateDelay(300);
    setRamas(ramas.filter(r => r.id !== selectedRow.id));
    setSelectedRow(null);
    alert('Rama eliminada correctamente');
  };

  const handleFormSubmit = async (data) => {
    await simulateDelay(300);
    if (formMode === 'create') {
      const newRama = { ...data, id: Math.max(...ramas.map(r => r.id), 0) + 1 };
      setRamas([...ramas, newRama]);
      alert('Rama creada correctamente');
    } else {
      const updatedRamas = ramas.map(r => (r.id === selectedRow.id ? { ...data, id: r.id } : r));
      setRamas(updatedRamas);
      setSelectedRow(null);
      alert('Rama actualizada correctamente');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Ramas</h1>
        <p className="text-gray-600 mt-2">Administra las ramas del repositorio</p>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <span>➕</span> Crear Rama
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
        <GridRamas ramas={ramas} onRowSelect={setSelectedRow} />
      )}

      <FormRamas
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        initialData={selectedRow}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

