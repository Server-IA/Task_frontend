import axiosInstance from '@/shared/config/axiosConfig';

export const estadosService = {
  getAll: async () => {
    const { data } = await axiosInstance.get('/estados');
    return data;
  },
  getById: async (id) => {
    const { data } = await axiosInstance.get(`/estados/${id}`);
    return data;
  },
  create: async (estado) => {
    const { data } = await axiosInstance.post('/estados', estado);
    return data;
  },
  update: async (id, estado) => {
    const { data } = await axiosInstance.put(`/estados/${id}`, estado);
    return data;
  },
  delete: async (id) => {
    await axiosInstance.delete(`/estados/${id}`);
  },
};
