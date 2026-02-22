import axiosInstance from '../config/axiosConfig';

export const estadosService = {
  getAll: async () => {
    const response = await axiosInstance.get('/estados');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/estados/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/estados', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/estados/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/estados/${id}`);
    return response.data;
  },
};
