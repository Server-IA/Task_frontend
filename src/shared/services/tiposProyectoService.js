import axiosInstance from '../config/axiosConfig';

export const tiposProyectoService = {
  getAll: async () => {
    const response = await axiosInstance.get('/tipos-proyecto');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/tipos-proyecto/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/tipos-proyecto', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/tipos-proyecto/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/tipos-proyecto/${id}`);
    return response.data;
  },
};
