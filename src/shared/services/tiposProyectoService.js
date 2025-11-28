/**
 * @file tiposProyectoService.js
 * @description Servicio para gestión de tipos de proyecto (CRUD)
 * Maneja la lógica de datos para tipos de proyecto
 */

import axiosInstance from '../config/axiosConfig';
import { mockTiposProyecto, mockEstados, simulateDelay } from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Tipos de Proyecto
 * Proporciona métodos para operaciones CRUD sobre tipos de proyecto
 */
export const tiposProyectoService = {
  /**
   * Obtener todos los tipos de proyecto (con datos enriquecidos)
   * @returns {Promise<Array>} Lista de tipos de proyecto con nombre del estado
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const enrichedData = mockTiposProyecto.map(tipo => ({
        ...tipo,
        estadoNombre: mockEstados.find(e => e.id === tipo.estadoId)?.nombre || 'N/A',
      }));
      return enrichedData;
    }
    const response = await axiosInstance.get('/tipos-proyecto');
    return response.data;
  },

  /**
   * Obtener un tipo de proyecto por ID
   * @param {number} id - ID del tipo de proyecto
   * @returns {Promise<Object>} Tipo de proyecto encontrado
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const tipo = mockTiposProyecto.find(t => t.id === id);
      if (!tipo) throw new Error('Tipo de proyecto no encontrado');
      return {
        ...tipo,
        estadoNombre: mockEstados.find(e => e.id === tipo.estadoId)?.nombre || 'N/A',
      };
    }
    const response = await axiosInstance.get(`/tipos-proyecto/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo tipo de proyecto
   * @param {Object} data - Datos del tipo de proyecto a crear
   * @returns {Promise<Object>} Tipo de proyecto creado
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newTipo = {
        ...data,
        id: Math.max(...mockTiposProyecto.map(t => t.id), 0) + 1,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockTiposProyecto.push(newTipo);
      return newTipo;
    }
    const response = await axiosInstance.post('/tipos-proyecto', data);
    return response.data;
  },

  /**
   * Actualizar un tipo de proyecto existente
   * @param {number} id - ID del tipo de proyecto a actualizar
   * @param {Object} data - Nuevos datos del tipo de proyecto
   * @returns {Promise<Object>} Tipo de proyecto actualizado
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockTiposProyecto.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Tipo de proyecto no encontrado');
      const updatedTipo = {
        ...data,
        id,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockTiposProyecto[index] = updatedTipo;
      return updatedTipo;
    }
    const response = await axiosInstance.put(`/tipos-proyecto/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un tipo de proyecto
   * @param {number} id - ID del tipo de proyecto a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockTiposProyecto.findIndex(t => t.id === id);
      if (index === -1) throw new Error('Tipo de proyecto no encontrado');
      mockTiposProyecto.splice(index, 1);
      return { success: true, message: 'Tipo de proyecto eliminado' };
    }
    const response = await axiosInstance.delete(`/tipos-proyecto/${id}`);
    return response.data;
  },
};

