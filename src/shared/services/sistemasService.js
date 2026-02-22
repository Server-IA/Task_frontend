import axiosInstance from '../config/axiosConfig';

export const sistemasService = {
  getAll: async () => {
    const response = await axiosInstance.get('/sistemas');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/sistemas/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/sistemas', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/sistemas/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/sistemas/${id}`);
    return response.data;
  },
};
