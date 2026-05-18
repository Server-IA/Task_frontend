import axiosInstance from '@/shared/config/axiosConfig';

export const usuariosService = {
  /** Búsqueda de usuarios para invitar (mín. 2 caracteres en backend). */
  buscar: async (q) => {
    const { data } = await axiosInstance.get('/usuarios/buscar', { params: { q } });
    return data;
  },
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
