import axiosInstance from '../config/axiosConfig';

export const empresasService = {
  getAll: async () => {
    const response = await axiosInstance.get('/empresas');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/empresas/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/empresas', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/empresas/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/empresas/${id}`);
    return response.data;
  },
};
