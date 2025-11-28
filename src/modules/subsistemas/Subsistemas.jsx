import { useState, useEffect } from 'react';
import GridSubsistemas from './GridSubsistemas';
import FormSubsistemas from './FormSubsistemas';
import { subsistemasService, sistemasService, estadosService } from '../../shared/services';

export default function Subsistemas() {
  const [subsistemas, setSubsistemas] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [estados, setEstados] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsistemasData, sistemasData, estadosData] = await Promise.all([
        subsistemasService.getAll(),
        sistemasService.getAll(),
        estadosService.getAll()
      ]);
      setSubsistemas(subsistemasData);
      setSistemas(sistemasData);
      setEstados(estadosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos');
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
    if (!window.confirm(`¿Eliminar el subsistema "${selectedRow.nombre}"?`)) return;
    
    try {
      await subsistemasService.delete(selectedRow.id);
      await loadData();
      setSelectedRow(null);
      alert('Subsistema eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando subsistema:', error);
      alert('Error al eliminar el subsistema');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (formMode === 'create') {
        await subsistemasService.create(data);
        alert('Subsistema creado correctamente');
      } else {
        await subsistemasService.update(selectedRow.id, data);
        alert('Subsistema actualizado correctamente');
      }
      await loadData();
      setFormOpen(false);
      setSelectedRow(null);
    } catch (error) {
      console.error('Error guardando subsistema:', error);
      alert('Error al guardar el subsistema');
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
          Crear Subsistema
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

