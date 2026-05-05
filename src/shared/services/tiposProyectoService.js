import axiosInstance from '@/shared/config/axiosConfig';

export const tiposProyectoService = {
  getAll: async () => {
    const { data } = await axiosInstance.get('/tipos-proyecto');
    return data;
  },
  getById: async (id) => {
    const { data } = await axiosInstance.get(`/tipos-proyecto/${id}`);
    return data;
  },
  create: async (tipo) => {
    const { data } = await axiosInstance.post('/tipos-proyecto', tipo);
    return data;
  },
  update: async (id, tipo) => {
    const { data } = await axiosInstance.put(`/tipos-proyecto/${id}`, tipo);
    return data;
  },
  delete: async (id) => {
    await axiosInstance.delete(`/tipos-proyecto/${id}`);
  },
};
