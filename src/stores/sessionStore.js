import { create } from 'zustand'
import { setLanguage } from '@/i18n'
import { tokenStorage } from '@/lib/tokenStorage'

/**
 * Sesión del usuario.
 * - El access token vive solo en memoria.
 * - El refresh token se guarda en localStorage (ver tokenStorage) para sobrevivir a recargas.
 *
 * status: 'loading' (recuperando la sesión al abrir la app) | 'authenticated' | 'anonymous'
 *   | 'offline' (al abrir la app no se pudo contactar al backend; se conserva el token para reintentar)
 */
/**
 * El idioma elegido en el perfil manda sobre el de este navegador: si la cuenta tiene uno y es otro, se cambia (la
 * página se recarga). Una cuenta que nunca lo eligió (`language` vacío) deja el del navegador.
 */
function followAccountLanguage(user) {
  if (user?.language) setLanguage(user.language)
}

export const useSessionStore = create((set) => ({
  status: tokenStorage.get() ? 'loading' : 'anonymous',
  accessToken: null,
  /** @type {import('@/api/types').UserResponse | null} */
  user: null,
  /** true si la sesión se cerró a propósito: el login siguiente no vuelve a la página del usuario anterior. */
  loggedOut: false,
  /** true si la sesión venció (el refresh token ya no sirve): el login lo dice. Un cierre de sesión normal, no. */
  expired: false,

  /** @param {import('@/api/types').AuthResponse} auth */
  setSession: (auth) => {
    tokenStorage.set(auth.refreshToken)
    set({ status: 'authenticated', accessToken: auth.accessToken, user: auth.user, loggedOut: false, expired: false })
    followAccountLanguage(auth.user)
  },

  setUser: (user) => {
    set({ user })
    followAccountLanguage(user)
  },

  /** @param {{ loggedOut?: boolean, expired?: boolean }} [options] */
  clearSession: ({ loggedOut = false, expired = false } = {}) => {
    tokenStorage.clear()
    set({ status: 'anonymous', accessToken: null, user: null, loggedOut, expired: expired && !loggedOut })
  },
}))
