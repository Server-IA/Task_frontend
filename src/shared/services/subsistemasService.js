import axiosInstance from '../config/axiosConfig';

export const subsistemasService = {
  getAll: async () => {
    const response = await axiosInstance.get('/subsistemas');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/subsistemas/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/subsistemas', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/subsistemas/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/subsistemas/${id}`);
    return response.data;
  },
};
