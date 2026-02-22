import axiosInstance from '../config/axiosConfig';

export const proyectosService = {
  getAll: async () => {
    const response = await axiosInstance.get('/proyectos');
    return response.data;
  },

  getById: async (id) => {
    const response = await axiosInstance.get(`/proyectos/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await axiosInstance.post('/proyectos', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosInstance.put(`/proyectos/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosInstance.delete(`/proyectos/${id}`);
    return response.data;
  },
};
