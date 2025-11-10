/**
 * @file Proyectos.jsx
 * @module Proyectos
 * @description Componente principal para la gestión de proyectos
 */

import { useState, useEffect } from 'react';
import GridProyectos from './GridProyectos';
import FormProyectos from './FormProyectos';
import { 
  mockProyectos, 
  mockEmpresas, 
  mockTiposProyecto, 
  mockEstados,
  simulateDelay 
} from '../../shared/config/mockData';

export default function Proyectos() {
  // ===========================
  // ESTADO
  // ===========================
  const [proyectos, setProyectos] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);

  // Catálogos para el formulario
  const [empresas] = useState(mockEmpresas);
  const [tiposProyecto] = useState(mockTiposProyecto);
  const [estados] = useState(mockEstados);

  // ===========================
  // EFECTOS
  // ===========================
  useEffect(() => {
    loadProyectos();
  }, []);

  // ===========================
  // FUNCIONES DE DATOS
  // ===========================
  const loadProyectos = async () => {
    setLoading(true);
    await simulateDelay(300);
    
    // Enriquecer datos con nombres de entidades relacionadas
    const enrichedData = mockProyectos.map(proyecto => ({
      ...proyecto,
      empresaNombre: empresas.find(e => e.id === proyecto.empresaId)?.nombre || 'N/A',
      tipoProyectoNombre: tiposProyecto.find(t => t.id === proyecto.tipoProyectoId)?.nombre || 'N/A',
      estadoNombre: estados.find(e => e.id === proyecto.estadoId)?.nombre || 'N/A',
    }));
    
    setProyectos(enrichedData);
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

    // Simular eliminación
    await simulateDelay(300);
    const newProyectos = proyectos.filter(p => p.id !== selectedRow.id);
    setProyectos(newProyectos);
    setSelectedRow(null);
    alert('Proyecto eliminado correctamente');
  };

  const handleFormSubmit = async (data) => {
    await simulateDelay(300);
    
    if (formMode === 'create') {
      // Crear nuevo proyecto
      const newProyecto = {
        ...data,
        id: Math.max(...proyectos.map(p => p.id), 0) + 1,
        empresaNombre: empresas.find(e => e.id === Number(data.empresaId))?.nombre || 'N/A',
        tipoProyectoNombre: tiposProyecto.find(t => t.id === Number(data.tipoProyectoId))?.nombre || 'N/A',
        estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      setProyectos([...proyectos, newProyecto]);
      alert('Proyecto creado correctamente');
    } else {
      // Actualizar proyecto existente
      const updatedProyectos = proyectos.map(p =>
        p.id === selectedRow.id
          ? {
              ...data,
              id: p.id,
              empresaNombre: empresas.find(e => e.id === Number(data.empresaId))?.nombre || 'N/A',
              tipoProyectoNombre: tiposProyecto.find(t => t.id === Number(data.tipoProyectoId))?.nombre || 'N/A',
              estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
            }
          : p
      );
      setProyectos(updatedProyectos);
      setSelectedRow(null);
      alert('Proyecto actualizado correctamente');
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
          <span>➕</span>
          Crear Proyecto
        </button>

        <button
          onClick={handleEdit}
          disabled={!selectedRow}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>✏️</span>
          Editar
        </button>

        <button
          onClick={handleDelete}
          disabled={!selectedRow}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>🗑️</span>
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

