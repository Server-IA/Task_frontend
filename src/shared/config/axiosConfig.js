/**
 * @file axiosConfig.js
 * @description Configuración de Axios para futuras conexiones con el backend
 * Este archivo está preparado para conectarse con un backend REST API
 */

import axios from 'axios';

// URL base del API - Por ahora apunta a localhost, cambiar cuando el backend esté disponible
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Instancia de Axios configurada con la URL base del API
 */
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos de timeout
});

/**
 * Interceptor de solicitud
 * Aquí se pueden agregar headers adicionales, tokens de autenticación, etc.
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // Ejemplo: Si en el futuro se implementa autenticación
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    
    console.log('📡 Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Interceptor de respuesta
 * Manejo centralizado de respuestas y errores
 */
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', error.response?.status, error.message);
    
    // Manejo de errores comunes
    if (error.response) {
      switch (error.response.status) {
        case 404:
          console.warn('Recurso no encontrado');
          break;
        case 500:
          console.error('Error del servidor');
          break;
        default:
          console.error('Error en la petición');
      }
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;

