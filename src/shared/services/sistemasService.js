/**
 * @file sistemasService.js
 * @description Servicio para gestión de sistemas (CRUD)
 * Maneja la lógica de datos para sistemas
 */

import axiosInstance from '../config/axiosConfig';
import { mockSistemas, mockEstados, simulateDelay } from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Sistemas
 * Proporciona métodos para operaciones CRUD sobre sistemas
 */
export const sistemasService = {
  /**
   * Obtener todos los sistemas (con datos enriquecidos)
   * @returns {Promise<Array>} Lista de sistemas con nombre del estado
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const enrichedData = mockSistemas.map(sistema => ({
        ...sistema,
        estadoNombre: mockEstados.find(e => e.id === sistema.estadoId)?.nombre || 'N/A',
      }));
      return enrichedData;
    }
    const response = await axiosInstance.get('/sistemas');
    return response.data;
  },

  /**
   * Obtener un sistema por ID
   * @param {number} id - ID del sistema
   * @returns {Promise<Object>} Sistema encontrado
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const sistema = mockSistemas.find(s => s.id === id);
      if (!sistema) throw new Error('Sistema no encontrado');
      return {
        ...sistema,
        estadoNombre: mockEstados.find(e => e.id === sistema.estadoId)?.nombre || 'N/A',
      };
    }
    const response = await axiosInstance.get(`/sistemas/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo sistema
   * @param {Object} data - Datos del sistema a crear
   * @returns {Promise<Object>} Sistema creado
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newSistema = {
        ...data,
        id: Math.max(...mockSistemas.map(s => s.id), 0) + 1,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockSistemas.push(newSistema);
      return newSistema;
    }
    const response = await axiosInstance.post('/sistemas', data);
    return response.data;
  },

  /**
   * Actualizar un sistema existente
   * @param {number} id - ID del sistema a actualizar
   * @param {Object} data - Nuevos datos del sistema
   * @returns {Promise<Object>} Sistema actualizado
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockSistemas.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Sistema no encontrado');
      const updatedSistema = {
        ...data,
        id,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockSistemas[index] = updatedSistema;
      return updatedSistema;
    }
    const response = await axiosInstance.put(`/sistemas/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un sistema
   * @param {number} id - ID del sistema a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockSistemas.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Sistema no encontrado');
      mockSistemas.splice(index, 1);
      return { success: true, message: 'Sistema eliminado' };
    }
    const response = await axiosInstance.delete(`/sistemas/${id}`);
    return response.data;
  },
};

