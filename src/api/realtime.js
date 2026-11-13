import { API_URL } from '@/api/client'
import { getLanguage } from '@/i18n'
import { useSessionStore } from '@/stores/sessionStore'

/** Esperas entre intentos de reconexión (la última se repite). */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000]
/** Con la pestaña en segundo plano tanto tiempo se cierra la conexión (al volver se abre y se refresca todo). */
export const HIDDEN_CLOSE_MS = 60_000
/** Una reconexión más rápida que esto (el cierre de cada 30 min) no pierde avisos: no hace falta refrescar todo. */
const CATCH_UP_MS = 3_000

/**
 * Lee los eventos completos de un texto Server-Sent Events. Devuelve los eventos y lo que sobra (un evento a medias
 * que se completa con lo siguiente que llegue). Los comentarios (`: latido`) se ignoran.
 * @returns {{ events: { event: string, data: any }[], rest: string }}
 */
export function parseSse(text) {
  const events = []
  const blocks = text.replace(/\r\n?/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    let event = 'message'
    const data = []
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue
      const colon = line.indexOf(':')
      const field = colon === -1 ? line : line.slice(0, colon)
      let value = colon === -1 ? '' : line.slice(colon + 1)
      if (value.startsWith(' ')) value = value.slice(1)
      if (field === 'event') event = value
      else if (field === 'data') data.push(value)
    }
    if (!data.length && event === 'message') continue
    const raw = data.join('\n')
    let parsed = raw
    try {
      parsed = raw ? JSON.parse(raw) : {}
    } catch {
      // Un dato que no es JSON se entrega tal cual
    }
    events.push({ event, data: parsed })
  }
  return { events, rest }
}

/**
 * Mantiene abierta la conexión de avisos mientras haya sesión: se reconecta sola (con esperas crecientes), renueva el
 * token si venció, y se cierra con la pestaña un rato en segundo plano.
 *
 * @param {{ onEvent: (event: { event: string, data: any }) => void, onReconnect: () => void }} handlers
 *   `onReconnect`: la conexión volvió después de estar caída o cerrada; pudo perderse algún aviso.
 * @returns {() => void} para cerrarla del todo
 */
export function startRealtime({ onEvent, onReconnect }) {
  let stopped = false
  let controller = null
  let attempt = 0
  let connectedOnce = false
  // Cuándo se perdió la conexión: si estuvo caída más que un instante pudo perderse un aviso y se refresca todo
  let lostAt = 0
  let retryTimer = null
  let hiddenTimer = null
  let sleeping = false

  const schedule = (delay) => {
    clearTimeout(retryTimer)
    if (stopped || sleeping) return
    retryTimer = setTimeout(run, delay)
  }

  async function run() {
    if (stopped || sleeping) return
    const { accessToken, status } = useSessionStore.getState()
    if (status !== 'authenticated' || !accessToken) {
      schedule(BACKOFF_MS[1])
      return
    }
    controller = new AbortController()
    const current = controller
    try {
      const response = await fetch(`${API_URL}/events`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'text/event-stream',
          'Accept-Language': getLanguage(),
        },
        cache: 'no-store',
        signal: current.signal,
      })
      if (response.status === 401) {
        // El token venció (duran 15 min): el refresh de siempre, de un solo vuelo, y se vuelve a intentar enseguida
        const { refreshSession } = await import('@/api/session')
        await refreshSession()
        schedule(0)
        return
      }
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { events, rest } = parseSse(buffer)
        buffer = rest
        for (const event of events) {
          if (event.event === 'ready') {
            if (connectedOnce && Date.now() - lostAt > CATCH_UP_MS) onReconnect()
            connectedOnce = true
            attempt = 0
            continue
          }
          onEvent(event)
        }
      }
      // El servidor la cerró (cada 30 min, o un despliegue): se vuelve a abrir enseguida
      lostAt = Date.now()
      schedule(attempt === 0 ? 0 : BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)])
      attempt++
    } catch {
      if (stopped || current.signal.aborted) return
      lostAt = Date.now()
      schedule(BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)])
      attempt++
    }
  }

  const sleep = () => {
    sleeping = true
    clearTimeout(retryTimer)
    controller?.abort()
  }
  const wake = () => {
    if (!sleeping) return
    sleeping = false
    attempt = 0
    // Pudo cambiar algo mientras dormía: al abrirse, `ready` avisa con onReconnect
    connectedOnce = true
    lostAt = 0
    run()
  }
  const onVisibility = () => {
    clearTimeout(hiddenTimer)
    if (document.visibilityState === 'hidden') hiddenTimer = setTimeout(sleep, HIDDEN_CLOSE_MS)
    else wake()
  }
  // Sin red no tiene sentido esperar el próximo intento: al volver, se intenta ya
  const onOnline = () => {
    if (!sleeping && !stopped) {
      attempt = 0
      schedule(0)
    }
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)
  run()

  return () => {
    stopped = true
    clearTimeout(retryTimer)
    clearTimeout(hiddenTimer)
    controller?.abort()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', onOnline)
  }
}
