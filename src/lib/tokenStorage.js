const REFRESH_TOKEN_KEY = 'taskflow-refresh-token'

/**
 * Refresh token en localStorage. Es accesible por JavaScript (un XSS podría leerlo); es el
 * compromiso aceptado en el plan porque el backend lo devuelve en el cuerpo y no en una cookie.
 */
export const tokenStorage = {
  key: REFRESH_TOKEN_KEY,

  get() {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  },

  set(token) {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    } catch {
      // Navegación privada sin almacenamiento: la sesión dura lo que la pestaña
    }
  },

  clear() {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // ignorado
    }
  },
}
