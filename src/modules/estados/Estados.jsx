import { useState, useEffect } from 'react';
import GridEstados from './GridEstados';
import FormEstados from './FormEstados';
import { estadosService } from '../../shared/services';

export default function Estados() {
  const [estados, setEstados] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEstados();
  }, []);

  const loadEstados = async () => {
    setLoading(true);
    try {
      const data = await estadosService.getAll();
      setEstados(data);
    } catch (error) {
      console.error('Error cargando estados:', error);
      alert('Error al cargar los estados');
    }
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
    if (!window.confirm(`¿Eliminar el estado "${selectedRow.nombre}"?`)) return;
    
    try {
      await estadosService.delete(selectedRow.id);
      await loadEstados();
      setSelectedRow(null);
      alert('Estado eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando estado:', error);
      alert('Error al eliminar el estado');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (formMode === 'create') {
        await estadosService.create(data);
        alert('Estado creado correctamente');
      } else {
        await estadosService.update(selectedRow.id, data);
        alert('Estado actualizado correctamente');
      }
      await loadEstados();
      setFormOpen(false);
      setSelectedRow(null);
    } catch (error) {
      console.error('Error guardando estado:', error);
      alert('Error al guardar el estado');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Gestión de Estados</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">Administra los estados del sistema</p>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Crear Estado
        </button>
        <button onClick={handleEdit} disabled={!selectedRow} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Editar
        </button>
        <button onClick={handleDelete} disabled={!selectedRow} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          Eliminar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400 transition-colors">Cargando...</p>
        </div>
      ) : (
        <GridEstados estados={estados} onRowSelect={setSelectedRow} />
      )}

      <FormEstados
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        initialData={selectedRow}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

