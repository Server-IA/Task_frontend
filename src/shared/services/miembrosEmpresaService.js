import axiosInstance from '@/shared/config/axiosConfig';

export const miembrosEmpresaService = {
  getByEmpresa: async (empresaId) => {
    const { data } = await axiosInstance.get(`/empresas/${empresaId}/miembros`);
    return data;
  },
  add: async (empresaId, usuarioId, rol) => {
    const { data } = await axiosInstance.post(`/empresas/${empresaId}/miembros`, { usuarioId, rol });
    return data;
  },
  updateRol: async (empresaId, miembroId, rol) => {
    const { data } = await axiosInstance.put(`/empresas/${empresaId}/miembros/${miembroId}`, { rol });
    return data;
  },
  remove: async (empresaId, miembroId) => {
    await axiosInstance.delete(`/empresas/${empresaId}/miembros/${miembroId}`);
  },
};
