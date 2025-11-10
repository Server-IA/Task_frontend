/**
 * @file Empresas.jsx
 * @description Componente principal para la gestión de empresas
 */

import { useState, useEffect } from 'react';
import GridEmpresas from './GridEmpresas';
import FormEmpresas from './FormEmpresas';
import { mockEmpresas, mockEstados, simulateDelay } from '../../shared/config/mockData';

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [loading, setLoading] = useState(false);
  const [estados] = useState(mockEstados);

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    setLoading(true);
    await simulateDelay(300);
    const enrichedData = mockEmpresas.map(empresa => ({
      ...empresa,
      estadoNombre: estados.find(e => e.id === empresa.estadoId)?.nombre || 'N/A',
    }));
    setEmpresas(enrichedData);
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
    await simulateDelay(300);
    setEmpresas(empresas.filter(e => e.id !== selectedRow.id));
    setSelectedRow(null);
    alert('Empresa eliminada correctamente');
  };

  const handleFormSubmit = async (data) => {
    await simulateDelay(300);
    if (formMode === 'create') {
      const newEmpresa = {
        ...data,
        id: Math.max(...empresas.map(e => e.id), 0) + 1,
        estadoNombre: estados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      setEmpresas([...empresas, newEmpresa]);
      alert('Empresa creada correctamente');
    } else {
      const updatedEmpresas = empresas.map(e =>
        e.id === selectedRow.id
          ? { ...data, id: e.id, estadoNombre: estados.find(est => est.id === Number(data.estadoId))?.nombre || 'N/A' }
          : e
      );
      setEmpresas(updatedEmpresas);
      setSelectedRow(null);
      alert('Empresa actualizada correctamente');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Empresas</h1>
        <p className="text-gray-600 mt-2">Administra las empresas del sistema</p>
      </div>

      <div className="mb-4 flex gap-3">
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <span>➕</span> Crear Empresa
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

