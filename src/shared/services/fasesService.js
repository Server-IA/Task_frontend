/**
 * @file fasesService.js
 * @description Servicio para gestión de fases (CRUD)
 * Maneja la lógica de datos para fases
 */

import axiosInstance from '../config/axiosConfig';
import { mockFases, mockEstados, simulateDelay } from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Fases
 * Proporciona métodos para operaciones CRUD sobre fases
 */
export const fasesService = {
  /**
   * Obtener todas las fases (con datos enriquecidos)
   * @returns {Promise<Array>} Lista de fases con nombre del estado
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const enrichedData = mockFases.map(fase => ({
        ...fase,
        estadoNombre: mockEstados.find(e => e.id === fase.estadoId)?.nombre || 'N/A',
      }));
      return enrichedData;
    }
    const response = await axiosInstance.get('/fases');
    return response.data;
  },

  /**
   * Obtener una fase por ID
   * @param {number} id - ID de la fase
   * @returns {Promise<Object>} Fase encontrada
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const fase = mockFases.find(f => f.id === id);
      if (!fase) throw new Error('Fase no encontrada');
      return {
        ...fase,
        estadoNombre: mockEstados.find(e => e.id === fase.estadoId)?.nombre || 'N/A',
      };
    }
    const response = await axiosInstance.get(`/fases/${id}`);
    return response.data;
  },

  /**
   * Crear una nueva fase
   * @param {Object} data - Datos de la fase a crear
   * @returns {Promise<Object>} Fase creada
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newFase = {
        ...data,
        id: Math.max(...mockFases.map(f => f.id), 0) + 1,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockFases.push(newFase);
      return newFase;
    }
    const response = await axiosInstance.post('/fases', data);
    return response.data;
  },

  /**
   * Actualizar una fase existente
   * @param {number} id - ID de la fase a actualizar
   * @param {Object} data - Nuevos datos de la fase
   * @returns {Promise<Object>} Fase actualizada
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockFases.findIndex(f => f.id === id);
      if (index === -1) throw new Error('Fase no encontrada');
      const updatedFase = {
        ...data,
        id,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockFases[index] = updatedFase;
      return updatedFase;
    }
    const response = await axiosInstance.put(`/fases/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar una fase
   * @param {number} id - ID de la fase a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockFases.findIndex(f => f.id === id);
      if (index === -1) throw new Error('Fase no encontrada');
      mockFases.splice(index, 1);
      return { success: true, message: 'Fase eliminada' };
    }
    const response = await axiosInstance.delete(`/fases/${id}`);
    return response.data;
  },
};

