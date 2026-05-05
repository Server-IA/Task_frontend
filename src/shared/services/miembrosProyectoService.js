import axiosInstance from '@/shared/config/axiosConfig';

export const miembrosProyectoService = {
  getByProyecto: async (proyectoId) => {
    const { data } = await axiosInstance.get(`/proyectos/${proyectoId}/miembros`);
    return data;
  },
  add: async (proyectoId, usuarioId, rol) => {
    const { data } = await axiosInstance.post(`/proyectos/${proyectoId}/miembros`, { usuarioId, rol });
    return data;
  },
  updateRol: async (proyectoId, miembroId, rol) => {
    const { data } = await axiosInstance.put(`/proyectos/${proyectoId}/miembros/${miembroId}`, { rol });
    return data;
  },
  remove: async (proyectoId, miembroId) => {
    await axiosInstance.delete(`/proyectos/${proyectoId}/miembros/${miembroId}`);
  },
};
