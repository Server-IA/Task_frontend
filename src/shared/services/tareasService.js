import axiosInstance from '@/shared/config/axiosConfig';

export const tareasService = {
  getAll: async () => {
    const { data } = await axiosInstance.get('/tareas');
    return data;
  },
  getById: async (id) => {
    const { data } = await axiosInstance.get(`/tareas/${id}`);
    return data;
  },
  getByProyecto: async (proyectoId) => {
    const { data } = await axiosInstance.get(`/tareas/proyecto/${proyectoId}`);
    return data;
  },
  getByAsignado: async (asignadoId) => {
    const { data } = await axiosInstance.get(`/tareas/asignado/${asignadoId}`);
    return data;
  },
  getByProyectoAndEstado: async (proyectoId, estadoId) => {
    const { data } = await axiosInstance.get(`/tareas/proyecto/${proyectoId}/estado/${estadoId}`);
    return data;
  },
  create: async (tarea) => {
    const { data } = await axiosInstance.post('/tareas', tarea);
    return data;
  },
  update: async (id, tarea) => {
    const { data } = await axiosInstance.put(`/tareas/${id}`, tarea);
    return data;
  },
  delete: async (id) => {
    await axiosInstance.delete(`/tareas/${id}`);
  },
};
