const KEY = 'taskflow-pending-invitation'

/**
 * Token de una invitación que el usuario abrió sin sesión. Se guarda para volver a ella después de
 * registrarse, verificar el correo e iniciar sesión (ese recorrido pasa por un enlace del correo).
 */
export const pendingInvitation = {
  get() {
    try {
      return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY)
    } catch {
      return null
    }
  },
  set(token) {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      // ignorado
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY)
    } catch {
      // ignorado
    }
  },
}

/** A dónde ir después de iniciar sesión: la página que pedía, una invitación pendiente o el inicio. */
export function getPostLoginPath(location) {
  const from = location.state?.from
  if (from?.pathname && from.pathname !== '/login') {
    return `${from.pathname}${from.search ?? ''}`
  }
  const token = pendingInvitation.get()
  if (token) return `/invitations/${token}`
  return '/'
}
