import axiosInstance from '../config/axiosConfig';

export const fasesService = {
  getAll: async () => {
    const response = await axiosInstance.get('/fases');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/fases/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/fases', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/fases/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/fases/${id}`);
    return response.data;
  },
};
