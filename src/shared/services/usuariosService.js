import axiosInstance from '@/shared/config/axiosConfig';

export const usuariosService = {
  getAll: async () => {
    const { data } = await axiosInstance.get('/usuarios');
    return data;
  },
  getMe: async () => {
    const { data } = await axiosInstance.get('/usuarios/me');
    return data;
  },
  updateMe: async (userData) => {
    const { data } = await axiosInstance.put('/usuarios/me', userData);
    return data;
  },
};
