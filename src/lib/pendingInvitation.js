const KEY = 'taskflow-pending-invitation'
/** Si no se sabe cuándo vence la invitación, se olvida a los 7 días. */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Token de una invitación que el usuario abrió sin sesión. Se guarda para volver a ella después de
 * registrarse, verificar el correo e iniciar sesión (ese recorrido pasa por un enlace del correo).
 * Caduca con la invitación: si no, secuestraría cada login posterior en este navegador.
 */
export const pendingInvitation = {
  get() {
    try {
      const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY)
      if (!raw) return null
      const entry = parse(raw)
      if (!entry || entry.expiresAt <= Date.now()) {
        pendingInvitation.clear()
        return null
      }
      return entry.token
    } catch {
      return null
    }
  },
  /** @param {string} token @param {string | null} [expiresAt] vencimiento de la invitación (ISO) */
  set(token, expiresAt = null) {
    try {
      const expiry = expiresAt ? Date.parse(expiresAt) : NaN
      const entry = { token, expiresAt: Number.isFinite(expiry) ? expiry : Date.now() + DEFAULT_TTL_MS }
      localStorage.setItem(KEY, JSON.stringify(entry))
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

/** Formato guardado: JSON `{ token, expiresAt }`; las versiones anteriores guardaban solo el token. */
function parse(raw) {
  try {
    const entry = JSON.parse(raw)
    if (entry && typeof entry.token === 'string' && typeof entry.expiresAt === 'number') return entry
  } catch {
    // token suelto de una versión anterior
  }
  return { token: raw, expiresAt: Date.now() + DEFAULT_TTL_MS }
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
