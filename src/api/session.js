import axios from 'axios'
import { API_URL } from '@/api/client'
import { toApiError } from '@/lib/errors'
import { tokenStorage } from '@/lib/tokenStorage'
import { useSessionStore } from '@/stores/sessionStore'

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
    inFlight = withCrossTabLock(doRefresh).finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

async function doRefresh() {
  const refreshToken = tokenStorage.get()
  if (!refreshToken) {
    useSessionStore.getState().clearSession()
    throw new Error('No hay sesión')
  }
  try {
    // axios "crudo": esta petición no debe pasar por los interceptores del cliente
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
    useSessionStore.getState().setSession(data)
    return data.accessToken
  } catch (error) {
    const { status } = toApiError(error)
    // 400/401: el token ya no sirve → se cierra la sesión. Sin red: se conserva para reintentar.
    if (status === 400 || status === 401) {
      useSessionStore.getState().clearSession()
    }
    throw error
  }
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
  try {
    await refreshSession()
  } catch {
    // Sin red al arrancar: se trata como sesión cerrada para no dejar la app colgada
    if (useSessionStore.getState().status === 'loading') {
      useSessionStore.setState({ status: 'anonymous', accessToken: null, user: null })
    }
  }
}

/** Si otra pestaña cierra sesión (borra el refresh token), esta también se cierra. */
export function listenToOtherTabs() {
  const onStorage = (event) => {
    if (event.key === tokenStorage.key && event.newValue === null) {
      useSessionStore.getState().clearSession()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
