import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axiosInstance from '@/shared/config/axiosConfig';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user && !!localStorage.getItem('token');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      fetchProfile().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await axiosInstance.get('/auth/perfil');
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        logout();
      }
      return null;
    }
  };

  const login = async (email, password) => {
    const { data } = await axiosInstance.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    const userData = {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      apodo: data.apodo,
      email: data.email,
      emailVerificado: data.emailVerificado,
    };
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    return data;
  };

  const register = async (registroData) => {
    const { data } = await axiosInstance.post('/auth/registro', registroData);
    return data;
  };

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await axiosInstance.post('/auth/logout', { refreshToken });
      }
    } catch {
      // silently fail
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const verificarEmail = async (token) => {
    const { data } = await axiosInstance.get('/auth/verificar-email', {
      params: { token },
    });
    return data;
  };

  const reenviarVerificacion = async (email) => {
    const { data } = await axiosInstance.post('/auth/reenviar-verificacion', { email });
    return data;
  };

  const solicitarReset = async (email) => {
    const { data } = await axiosInstance.post('/auth/solicitar-reset', { email });
    return data;
  };

  const resetPassword = async (token, nuevaPassword) => {
    const { data } = await axiosInstance.post('/auth/reset-password', { token, nuevaPassword });
    return data;
  };

  const updateProfile = async (profileData) => {
    const { data } = await axiosInstance.put('/usuarios/me', profileData);
    setUser(data);
    localStorage.setItem('user', JSON.stringify(data));
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        fetchProfile,
        verificarEmail,
        reenviarVerificacion,
        solicitarReset,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
