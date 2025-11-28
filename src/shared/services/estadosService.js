/**
 * @file estadosService.js
 * @description Servicio para gestión de estados (CRUD)
 * Maneja la lógica de datos para estados
 */

import axiosInstance from '../config/axiosConfig';
import { mockEstados, simulateDelay } from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Estados
 * Proporciona métodos para operaciones CRUD sobre estados
 */
export const estadosService = {
  /**
   * Obtener todos los estados
   * @returns {Promise<Array>} Lista de estados
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      return [...mockEstados];
    }
    const response = await axiosInstance.get('/estados');
    return response.data;
  },

  /**
   * Obtener un estado por ID
   * @param {number} id - ID del estado
   * @returns {Promise<Object>} Estado encontrado
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const estado = mockEstados.find(e => e.id === id);
      if (!estado) throw new Error('Estado no encontrado');
      return estado;
    }
    const response = await axiosInstance.get(`/estados/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo estado
   * @param {Object} data - Datos del estado a crear
   * @returns {Promise<Object>} Estado creado
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newEstado = {
        ...data,
        id: Math.max(...mockEstados.map(e => e.id), 0) + 1,
      };
      mockEstados.push(newEstado);
      return newEstado;
    }
    const response = await axiosInstance.post('/estados', data);
    return response.data;
  },

  /**
   * Actualizar un estado existente
   * @param {number} id - ID del estado a actualizar
   * @param {Object} data - Nuevos datos del estado
   * @returns {Promise<Object>} Estado actualizado
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockEstados.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Estado no encontrado');
      mockEstados[index] = { ...data, id };
      return mockEstados[index];
    }
    const response = await axiosInstance.put(`/estados/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un estado
   * @param {number} id - ID del estado a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockEstados.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Estado no encontrado');
      mockEstados.splice(index, 1);
      return { success: true, message: 'Estado eliminado' };
    }
    const response = await axiosInstance.delete(`/estados/${id}`);
    return response.data;
  },
};

