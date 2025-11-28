/**
 * @file proyectosService.js
 * @description Servicio para gestión de proyectos (CRUD)
 * Maneja la lógica de datos para proyectos
 */

import axiosInstance from '../config/axiosConfig';
import { 
  mockProyectos, 
  mockEmpresas, 
  mockTiposProyecto, 
  mockEstados, 
  simulateDelay 
} from '../config/mockData';

// Configuración: usar mock o API real
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * Servicio de Proyectos
 * Proporciona métodos para operaciones CRUD sobre proyectos
 */
export const proyectosService = {
  /**
   * Obtener todos los proyectos (con datos enriquecidos)
   * @returns {Promise<Array>} Lista de proyectos con nombres de empresa, tipo y estado
   */
  getAll: async () => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const enrichedData = mockProyectos.map(proyecto => ({
        ...proyecto,
        empresaNombre: mockEmpresas.find(e => e.id === proyecto.empresaId)?.nombre || 'N/A',
        tipoProyectoNombre: mockTiposProyecto.find(t => t.id === proyecto.tipoProyectoId)?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === proyecto.estadoId)?.nombre || 'N/A',
      }));
      return enrichedData;
    }
    const response = await axiosInstance.get('/proyectos');
    return response.data;
  },

  /**
   * Obtener un proyecto por ID
   * @param {number} id - ID del proyecto
   * @returns {Promise<Object>} Proyecto encontrado
   */
  getById: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(200);
      const proyecto = mockProyectos.find(p => p.id === id);
      if (!proyecto) throw new Error('Proyecto no encontrado');
      return {
        ...proyecto,
        empresaNombre: mockEmpresas.find(e => e.id === proyecto.empresaId)?.nombre || 'N/A',
        tipoProyectoNombre: mockTiposProyecto.find(t => t.id === proyecto.tipoProyectoId)?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === proyecto.estadoId)?.nombre || 'N/A',
      };
    }
    const response = await axiosInstance.get(`/proyectos/${id}`);
    return response.data;
  },

  /**
   * Crear un nuevo proyecto
   * @param {Object} data - Datos del proyecto a crear
   * @returns {Promise<Object>} Proyecto creado
   */
  create: async (data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const newProyecto = {
        ...data,
        id: Math.max(...mockProyectos.map(p => p.id), 0) + 1,
        empresaNombre: mockEmpresas.find(e => e.id === Number(data.empresaId))?.nombre || 'N/A',
        tipoProyectoNombre: mockTiposProyecto.find(t => t.id === Number(data.tipoProyectoId))?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockProyectos.push(newProyecto);
      return newProyecto;
    }
    const response = await axiosInstance.post('/proyectos', data);
    return response.data;
  },

  /**
   * Actualizar un proyecto existente
   * @param {number} id - ID del proyecto a actualizar
   * @param {Object} data - Nuevos datos del proyecto
   * @returns {Promise<Object>} Proyecto actualizado
   */
  update: async (id, data) => {
    if (USE_MOCK) {
      await simulateDelay(400);
      const index = mockProyectos.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Proyecto no encontrado');
      const updatedProyecto = {
        ...data,
        id,
        empresaNombre: mockEmpresas.find(e => e.id === Number(data.empresaId))?.nombre || 'N/A',
        tipoProyectoNombre: mockTiposProyecto.find(t => t.id === Number(data.tipoProyectoId))?.nombre || 'N/A',
        estadoNombre: mockEstados.find(e => e.id === Number(data.estadoId))?.nombre || 'N/A',
      };
      mockProyectos[index] = updatedProyecto;
      return updatedProyecto;
    }
    const response = await axiosInstance.put(`/proyectos/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar un proyecto
   * @param {number} id - ID del proyecto a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  delete: async (id) => {
    if (USE_MOCK) {
      await simulateDelay(300);
      const index = mockProyectos.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Proyecto no encontrado');
      mockProyectos.splice(index, 1);
      return { success: true, message: 'Proyecto eliminado' };
    }
    const response = await axiosInstance.delete(`/proyectos/${id}`);
    return response.data;
  },
};

