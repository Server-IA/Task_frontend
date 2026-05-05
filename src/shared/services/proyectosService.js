import axiosInstance from '@/shared/config/axiosConfig';

export const proyectosService = {
  getAll: async () => {
    const { data } = await axiosInstance.get('/proyectos');
    return data;
  },
  getById: async (id) => {
    const { data } = await axiosInstance.get(`/proyectos/${id}`);
    return data;
  },
  getByEmpresa: async (empresaId) => {
    const { data } = await axiosInstance.get(`/proyectos/empresa/${empresaId}`);
    return data;
  },
  create: async (proyecto) => {
    const { data } = await axiosInstance.post('/proyectos', proyecto);
    return data;
  },
  update: async (id, proyecto) => {
    const { data } = await axiosInstance.put(`/proyectos/${id}`, proyecto);
    return data;
  },
  delete: async (id) => {
    await axiosInstance.delete(`/proyectos/${id}`);
  },
};
