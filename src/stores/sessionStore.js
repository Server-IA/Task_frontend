import { create } from 'zustand'
import { tokenStorage } from '@/lib/tokenStorage'

/**
 * Sesión del usuario.
 * - El access token vive solo en memoria.
 * - El refresh token se guarda en localStorage (ver tokenStorage) para sobrevivir a recargas.
 *
 * status: 'loading' (recuperando la sesión al abrir la app) | 'authenticated' | 'anonymous'
 *   | 'offline' (al abrir la app no se pudo contactar al backend; se conserva el token para reintentar)
 */
export const useSessionStore = create((set) => ({
  status: tokenStorage.get() ? 'loading' : 'anonymous',
  accessToken: null,
  /** @type {import('@/api/types').UserResponse | null} */
  user: null,
  /** true si la sesión se cerró a propósito: el login siguiente no vuelve a la página del usuario anterior. */
  loggedOut: false,

  /** @param {import('@/api/types').AuthResponse} auth */
  setSession: (auth) => {
    tokenStorage.set(auth.refreshToken)
    set({ status: 'authenticated', accessToken: auth.accessToken, user: auth.user, loggedOut: false })
  },

  setUser: (user) => set({ user }),

  /** @param {{ loggedOut?: boolean }} [options] */
  clearSession: ({ loggedOut = false } = {}) => {
    tokenStorage.clear()
    set({ status: 'anonymous', accessToken: null, user: null, loggedOut })
  },
}))
