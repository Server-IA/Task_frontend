import axiosInstance from '@/shared/config/axiosConfig';

export const comentariosService = {
  getByTarea: async (tareaId) => {
    const { data } = await axiosInstance.get(`/tareas/${tareaId}/comentarios`);
    return data;
  },
  create: async (tareaId, contenido) => {
    const { data } = await axiosInstance.post(`/tareas/${tareaId}/comentarios`, { contenido });
    return data;
  },
  update: async (tareaId, comentarioId, contenido) => {
    const { data } = await axiosInstance.put(`/tareas/${tareaId}/comentarios/${comentarioId}`, { contenido });
    return data;
  },
  delete: async (tareaId, comentarioId) => {
    await axiosInstance.delete(`/tareas/${tareaId}/comentarios/${comentarioId}`);
  },
};
