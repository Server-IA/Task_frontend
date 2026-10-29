import axios from 'axios'
import { API_URL } from '@/api/client'
import { toApiError } from '@/lib/errors'
import { tokenStorage } from '@/lib/tokenStorage'
import { useSessionStore } from '@/stores/sessionStore'

/** Tope del refresh: corre dentro de un lock compartido por las pestañas y no puede quedarse colgado. */
const REFRESH_TIMEOUT_MS = 15_000

/**
 * Refresh de un solo vuelo.
 *
 * El backend ROTA el refresh token en cada uso y, si recibe uno ya usado, cierra todas las
 * sesiones del usuario. Por eso nunca deben salir dos refresh a la vez:
 *  - dentro de la pestaña, todas las peticiones con 401 esperan la misma promesa;
 *  - entre pestañas, Web Locks serializa los refresh y cada uno lee el token más reciente.
 */
let inFlight = null

export function refreshSession() {
  if (!inFlight) {
    inFlight = withCrossTabLock(() => doRefresh()).finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

/**
 * Corre `task` sin que haya un refresh en curso (en esta pestaña ni en otras). El logout lo usa para leer
 * el refresh token vigente: si leyera uno que un refresh está rotando, revocaría el viejo y el nuevo
 * seguiría vivo en el servidor.
 */
export async function withSessionLock(task) {
  if (inFlight) await inFlight.catch(() => {})
  return withCrossTabLock(task)
}

async function doRefresh(retried = false) {
  const refreshToken = tokenStorage.get()
  if (!refreshToken) {
    useSessionStore.getState().clearSession()
    throw new Error('No hay sesión')
  }
  let data
  try {
    // axios "crudo": esta petición no debe pasar por los interceptores del cliente
    ;({ data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { timeout: REFRESH_TIMEOUT_MS }))
  } catch (error) {
    const { status } = toApiError(error)
    // 400/401: el token ya no sirve → se cierra la sesión. Sin red: se conserva para reintentar.
    if (status === 400 || status === 401) {
      const current = tokenStorage.get()
      // Otra pestaña guardó un token nuevo mientras tanto (login, cambio de contraseña): se usa ese
      // en vez de borrarlo.
      if (current && current !== refreshToken && !retried) return doRefresh(true)
      if (current === refreshToken) useSessionStore.getState().clearSession()
    }
    throw error
  }
  const current = tokenStorage.get()
  if (current !== refreshToken) {
    // Mientras volaba el refresh se cerró la sesión (o se inició otra): su resultado ya no vale.
    if (!current) throw new Error('Sesión cerrada')
    if (!retried) return doRefresh(true)
    throw new Error('Sesión reemplazada')
  }
  useSessionStore.getState().setSession(data)
  return data.accessToken
}

function withCrossTabLock(task) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('taskflow-refresh', task)
  }
  return task()
}

/** Al abrir la app: si hay refresh token, recupera la sesión (el access token no se persiste). */
export async function restoreSession() {
  if (!tokenStorage.get()) {
    useSessionStore.getState().clearSession()
    return
  }
  useSessionStore.setState({ status: 'loading' })
  try {
    await refreshSession()
  } catch {
    if (useSessionStore.getState().status !== 'loading') return
    // Sin red o backend caído: se conserva el token y se ofrece reintentar (SessionGate)
    if (tokenStorage.get()) {
      useSessionStore.setState({ status: 'offline', accessToken: null, user: null })
    } else {
      useSessionStore.setState({ status: 'anonymous', accessToken: null, user: null })
    }
  }
}

/** Si otra pestaña cierra sesión (borra el refresh token), esta también se cierra. */
export function listenToOtherTabs() {
  const onStorage = (event) => {
    if (event.key === tokenStorage.key && event.newValue === null) {
      useSessionStore.getState().clearSession({ loggedOut: true })
    }
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
