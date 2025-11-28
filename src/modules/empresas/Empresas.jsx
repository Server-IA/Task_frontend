/**
 * @file Empresas.jsx
 * @description Componente principal para la gestión de empresas
 */

import { useState, useEffect } from 'react';
import GridEmpresas from './GridEmpresas';
import FormEmpresas from './FormEmpresas';
import { empresasService, estadosService } from '../../shared/services';

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
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
      const [empresasData, estadosData] = await Promise.all([
        empresasService.getAll(),
        estadosService.getAll()
      ]);
      setEmpresas(empresasData);
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
    if (!window.confirm(`¿Eliminar la empresa "${selectedRow.nombre}"?`)) return;
    
    try {
      await empresasService.delete(selectedRow.id);
      await loadData();
      setSelectedRow(null);
      alert('Empresa eliminada correctamente');
    } catch (error) {
      console.error('Error eliminando empresa:', error);
      alert('Error al eliminar la empresa');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (formMode === 'create') {
        await empresasService.create(data);
        alert('Empresa creada correctamente');
      } else {
        await empresasService.update(selectedRow.id, data);
        alert('Empresa actualizada correctamente');
      }
      await loadData();
      setFormOpen(false);
      setSelectedRow(null);
    } catch (error) {
      console.error('Error guardando empresa:', error);
      alert('Error al guardar la empresa');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white transition-colors">Gestión de Empresas</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2 transition-colors">Administra las empresas del sistema</p>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Crear Empresa
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
        <GridEmpresas empresas={empresas} onRowSelect={setSelectedRow} />
      )}

      <FormEmpresas
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

