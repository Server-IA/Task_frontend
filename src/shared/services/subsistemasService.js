/**
 * @file subsistemasService.js
 * @description Servicio para gestión de subsistemas (CRUD)
 * Maneja la lógica de datos para subsistemas
 */

import axiosInstance from '../config/axiosConfig';
import { mockSubsistemas, mockSistemas, mockEstados, simulateDelay } from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Subsistemas
 * Proporciona métodos para operaciones CRUD sobre subsistemas
 */
export const subsistemasService = {
  /**
   * Obtener todos los subsistemas (con datos enriquecidos)
   * @returns {Promise<Array>} Lista de subsistemas con nombres de sistema y estado
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const enrichedData = mockSubsistemas.map(subsistema => ({
        ...subsistema,
        sistemaNombre: mockSistemas.find(s => s.id === subsistema.sistemaId)?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === subsistema.estadoId)?.nombre || 'N/A',
      }));
      return enrichedData;
    }
    const response = await axiosInstance.get('/subsistemas');
    return response.data;
  },

  /**
   * Obtener un subsistema por ID
   * @param {number} id - ID del subsistema
   * @returns {Promise<Object>} Subsistema encontrado
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const subsistema = mockSubsistemas.find(s => s.id === id);
      if (!subsistema) throw new Error('Subsistema no encontrado');
      return {
        ...subsistema,
        sistemaNombre: mockSistemas.find(s => s.id === subsistema.sistemaId)?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === subsistema.estadoId)?.nombre || 'N/A',
      };
    }
    const response = await axiosInstance.get(`/subsistemas/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo subsistema
   * @param {Object} data - Datos del subsistema a crear
   * @returns {Promise<Object>} Subsistema creado
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newSubsistema = {
        ...data,
        id: Math.max(...mockSubsistemas.map(s => s.id), 0) + 1,
        sistemaNombre: mockSistemas.find(s => s.id === Number(data.sistemaId))?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockSubsistemas.push(newSubsistema);
      return newSubsistema;
    }
    const response = await axiosInstance.post('/subsistemas', data);
    return response.data;
  },

  /**
   * Actualizar un subsistema existente
   * @param {number} id - ID del subsistema a actualizar
   * @param {Object} data - Nuevos datos del subsistema
   * @returns {Promise<Object>} Subsistema actualizado
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockSubsistemas.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Subsistema no encontrado');
      const updatedSubsistema = {
        ...data,
        id,
        sistemaNombre: mockSistemas.find(s => s.id === Number(data.sistemaId))?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockSubsistemas[index] = updatedSubsistema;
      return updatedSubsistema;
    }
    const response = await axiosInstance.put(`/subsistemas/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un subsistema
   * @param {number} id - ID del subsistema a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockSubsistemas.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Subsistema no encontrado');
      mockSubsistemas.splice(index, 1);
      return { success: true, message: 'Subsistema eliminado' };
    }
    const response = await axiosInstance.delete(`/subsistemas/${id}`);
    return response.data;
  },
};

