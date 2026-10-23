import { create } from 'zustand'
import { tokenStorage } from '@/lib/tokenStorage'

/**
 * Sesión del usuario.
 * - El access token vive solo en memoria.
 * - El refresh token se guarda en localStorage (ver tokenStorage) para sobrevivir a recargas.
 *
 * status: 'loading' (recuperando la sesión al abrir la app) | 'authenticated' | 'anonymous'
 */
export const useSessionStore = create((set) => ({
  status: tokenStorage.get() ? 'loading' : 'anonymous',
  accessToken: null,
  /** @type {import('@/api/types').UserResponse | null} */
  user: null,

  /** @param {import('@/api/types').AuthResponse} auth */
  setSession: (auth) => {
    tokenStorage.set(auth.refreshToken)
    set({ status: 'authenticated', accessToken: auth.accessToken, user: auth.user })
  },

  setUser: (user) => set({ user }),

  clearSession: () => {
    tokenStorage.clear()
    set({ status: 'anonymous', accessToken: null, user: null })
  },
}))
