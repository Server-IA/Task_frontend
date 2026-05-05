import axiosInstance from '@/shared/config/axiosConfig';

export const empresasService = {
  getAll: async () => {
    const { data } = await axiosInstance.get('/empresas');
    return data;
  },
  getById: async (id) => {
    const { data } = await axiosInstance.get(`/empresas/${id}`);
    return data;
  },
  create: async (empresa) => {
    const { data } = await axiosInstance.post('/empresas', empresa);
    return data;
  },
  update: async (id, empresa) => {
    const { data } = await axiosInstance.put(`/empresas/${id}`, empresa);
    return data;
  },
  delete: async (id) => {
    await axiosInstance.delete(`/empresas/${id}`);
  },
};
