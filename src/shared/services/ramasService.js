import axiosInstance from '../config/axiosConfig';

export const ramasService = {
  getAll: async () => {
    const response = await axiosInstance.get('/ramas');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/ramas/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/ramas', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/ramas/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/ramas/${id}`);
    return response.data;
  },
};
