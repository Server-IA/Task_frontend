import axios from 'axios'
import { toApiError } from '@/lib/errors'
import { useSessionStore } from '@/stores/sessionStore'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

/** Cliente HTTP de la API. Los componentes no lo usan directo: pasan por los servicios de cada feature. */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

// Agrega el access token a cada petición
api.interceptors.request.use((config) => {
  const { accessToken } = useSessionStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// 401 → refresh de un solo vuelo y se reintenta la petición una vez.
// Todos los errores salen normalizados como ApiError.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true
      try {
        // Import dinámico para evitar el ciclo client ↔ session
        const { refreshSession } = await import('@/api/session')
        const accessToken = await refreshSession()
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        return Promise.reject(toApiError(error))
      }
    }
    return Promise.reject(toApiError(error))
  },
)
