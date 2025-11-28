/**
 * @file empresasService.js
 * @description Servicio para gestión de empresas (CRUD)
 * Maneja la lógica de datos para empresas
 */

import axiosInstance from '../config/axiosConfig';
import { mockEmpresas, mockEstados, simulateDelay } from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Empresas
 * Proporciona métodos para operaciones CRUD sobre empresas
 */
export const empresasService = {
  /**
   * Obtener todas las empresas (con datos enriquecidos)
   * @returns {Promise<Array>} Lista de empresas con nombre del estado
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      // Enriquecer datos con el nombre del estado
      const enrichedData = mockEmpresas.map(empresa => ({
        ...empresa,
        estadoNombre: mockEstados.find(e => e.id === empresa.estadoId)?.nombre || 'N/A',
      }));
      return enrichedData;
    }
    const response = await axiosInstance.get('/empresas');
    return response.data;
  },

  /**
   * Obtener una empresa por ID
   * @param {number} id - ID de la empresa
   * @returns {Promise<Object>} Empresa encontrada
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const empresa = mockEmpresas.find(e => e.id === id);
      if (!empresa) throw new Error('Empresa no encontrada');
      return {
        ...empresa,
        estadoNombre: mockEstados.find(e => e.id === empresa.estadoId)?.nombre || 'N/A',
      };
    }
    const response = await axiosInstance.get(`/empresas/${id}`);
    return response.data;
  },

  /**
   * Crear una nueva empresa
   * @param {Object} data - Datos de la empresa a crear
   * @returns {Promise<Object>} Empresa creada
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newEmpresa = {
        ...data,
        id: Math.max(...mockEmpresas.map(e => e.id), 0) + 1,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockEmpresas.push(newEmpresa);
      return newEmpresa;
    }
    const response = await axiosInstance.post('/empresas', data);
    return response.data;
  },

  /**
   * Actualizar una empresa existente
   * @param {number} id - ID de la empresa a actualizar
   * @param {Object} data - Nuevos datos de la empresa
   * @returns {Promise<Object>} Empresa actualizada
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockEmpresas.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Empresa no encontrada');
      const updatedEmpresa = {
        ...data,
        id,
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockEmpresas[index] = updatedEmpresa;
      return updatedEmpresa;
    }
    const response = await axiosInstance.put(`/empresas/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar una empresa
   * @param {number} id - ID de la empresa a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockEmpresas.findIndex(e => e.id === id);
      if (index === -1) throw new Error('Empresa no encontrada');
      mockEmpresas.splice(index, 1);
      return { success: true, message: 'Empresa eliminada' };
    }
    const response = await axiosInstance.delete(`/empresas/${id}`);
    return response.data;
  },
};

