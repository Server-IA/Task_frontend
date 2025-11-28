/**
 * @file Proyectos.jsx
 * @module Proyectos
 * @description Componente principal para la gestión de proyectos
 */

import { useState, useEffect } from 'react';
import GridProyectos from './GridProyectos';
import FormProyectos from './FormProyectos';
import { 
  proyectosService, 
  empresasService, 
  tiposProyectoService, 
  estadosService 
} from '../../shared/services';

export default function Proyectos() {
  // ===========================
  // ESTADO
  // ===========================
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [tiposProyecto, setTiposProyecto] = useState([]);
  const [estados, setEstados] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);

  // ===========================
  // EFECTOS
  // ===========================
  useEffect(() => {
    loadData();
  }, []);

  // ===========================
  // FUNCIONES DE DATOS
  // ===========================
  const loadData = async () => {
    setLoading(true);
    try {
      const [proyectosData, empresasData, tiposData, estadosData] = await Promise.all([
        proyectosService.getAll(),
        empresasService.getAll(),
        tiposProyectoService.getAll(),
        estadosService.getAll()
      ]);
      setProyectos(proyectosData);
      setEmpresas(empresasData);
      setTiposProyecto(tiposData);
      setEstados(estadosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos');
    }
    setLoading(false);
  };

  // ===========================
  // HANDLERS DE EVENTOS
  // ===========================
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
    if (!window.confirm(`¿Eliminar el proyecto "${selectedRow.nombre}"?`)) return;

    try {
      await proyectosService.delete(selectedRow.id);
      await loadData();
      setSelectedRow(null);
      alert('Proyecto eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      alert('Error al eliminar el proyecto');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (formMode === 'create') {
        await proyectosService.create(data);
        alert('Proyecto creado correctamente');
      } else {
        await proyectosService.update(selectedRow.id, data);
        alert('Proyecto actualizado correctamente');
      }
      await loadData();
      setFormOpen(false);
      setSelectedRow(null);
    } catch (error) {
      console.error('Error guardando proyecto:', error);
      alert('Error al guardar el proyecto');
    }
  };

  // ===========================
  // RENDER
  // ===========================
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Proyectos</h1>
        <p className="text-gray-600 mt-2">Administra los proyectos del sistema</p>
      </div>

      {/* Botones de acción */}
      <div className="mb-4 flex gap-3">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Crear Proyecto
        </button>

        <button
          onClick={handleEdit}
          disabled={!selectedRow}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Editar
        </button>

        <button
          onClick={handleDelete}
          disabled={!selectedRow}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Eliminar
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      ) : (
        <GridProyectos
          proyectos={proyectos}
          onRowSelect={setSelectedRow}
        />
      )}

      {/* Formulario Modal */}
      <FormProyectos
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        initialData={selectedRow}
        onSubmit={handleFormSubmit}
        empresas={empresas}
        tiposProyecto={tiposProyecto}
        estados={estados}
      />
    </div>
  );
}

