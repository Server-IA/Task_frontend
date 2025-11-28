/**
 * @file ramasService.js
 * @description Servicio para gestión de ramas (CRUD)
 * Maneja la lógica de datos para ramas
 */

import axiosInstance from '../config/axiosConfig';
import { mockRamas, simulateDelay } from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Ramas
 * Proporciona métodos para operaciones CRUD sobre ramas
 */
export const ramasService = {
  /**
   * Obtener todas las ramas
   * @returns {Promise<Array>} Lista de ramas
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      return [...mockRamas];
    }
    const response = await axiosInstance.get('/ramas');
    return response.data;
  },

  /**
   * Obtener una rama por ID
   * @param {number} id - ID de la rama
   * @returns {Promise<Object>} Rama encontrada
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const rama = mockRamas.find(r => r.id === id);
      if (!rama) throw new Error('Rama no encontrada');
      return rama;
    }
    const response = await axiosInstance.get(`/ramas/${id}`);
    return response.data;
  },

  /**
   * Crear una nueva rama
   * @param {Object} data - Datos de la rama a crear
   * @returns {Promise<Object>} Rama creada
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newRama = {
        ...data,
        id: Math.max(...mockRamas.map(r => r.id), 0) + 1,
      };
      mockRamas.push(newRama);
      return newRama;
    }
    const response = await axiosInstance.post('/ramas', data);
    return response.data;
  },

  /**
   * Actualizar una rama existente
   * @param {number} id - ID de la rama a actualizar
   * @param {Object} data - Nuevos datos de la rama
   * @returns {Promise<Object>} Rama actualizada
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockRamas.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Rama no encontrada');
      mockRamas[index] = { ...data, id };
      return mockRamas[index];
    }
    const response = await axiosInstance.put(`/ramas/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar una rama
   * @param {number} id - ID de la rama a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockRamas.findIndex(r => r.id === id);
      if (index === -1) throw new Error('Rama no encontrada');
      mockRamas.splice(index, 1);
      return { success: true, message: 'Rama eliminada' };
    }
    const response = await axiosInstance.delete(`/ramas/${id}`);
    return response.data;
  },
};

