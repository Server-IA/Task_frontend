import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseSse, startRealtime } from '@/api/realtime'
import { useSessionStore } from '@/stores/sessionStore'
import { shouldRefresh, slugOf } from './refreshRules'

const refreshSession = vi.hoisted(() => vi.fn())
vi.mock('@/api/session', () => ({ refreshSession }))

const P = '0d405a1e-8e17-4d02-ae3a-23c8f3df6ab9'
const OTHER = '11111111-2222-3333-4444-555555555555'
const ISSUE = '1e04ab76-a639-42c5-956d-b30a1b5fac0b'

describe('parseSse', () => {
  it('lee eventos completos, ignora los latidos y guarda el que llegó a medias', () => {
    const { events, rest } = parseSse(
      'event:ready\ndata:{}\n\n: latido\n\nevent:change\ndata:{"workspace":"equipo","projectId":"p1"}\n\nevent:cha',
    )
    expect(events).toEqual([
      { event: 'ready', data: {} },
      { event: 'change', data: { workspace: 'equipo', projectId: 'p1' } },
    ])
    expect(rest).toBe('event:cha')
    // El resto se completa con lo siguiente que llega
    expect(parseSse(rest + 'nge\ndata: {"workspace":"x"}\r\n\r\n').events).toEqual([
      { event: 'change', data: { workspace: 'x' } },
    ])
  })
})

describe('shouldRefresh', () => {
  const batch = (changes, extra = {}) => ({
    changes,
    notifications: false,
    everything: false,
    currentSlug: 'equipo',
    ...extra,
  })

  it('un cambio de un proyecto refresca lo de ese proyecto, lo del workspace y lo abierto, no lo de otro proyecto', () => {
    const change = batch([{ workspace: 'equipo', projectId: P, issueId: ISSUE }])
    expect(shouldRefresh(['issues', P, { state: ['a'] }], change)).toBe(true)
    expect(shouldRefresh(['stats', P, 8], change)).toBe(true)
    expect(shouldRefresh(['github', 'equipo', 'project', P, 'pulls', 'open'], change)).toBe(true)
    expect(shouldRefresh(['myWork', 'equipo', 'assigned'], change)).toBe(true)
    expect(shouldRefresh(['issue', ISSUE], change)).toBe(true)
    expect(shouldRefresh(['comments', ISSUE], change)).toBe(true)
    expect(shouldRefresh(['issues', OTHER, {}], change)).toBe(false)
    expect(shouldRefresh(['states', OTHER], change)).toBe(false)
  })

  it('lo que nunca depende de otros no se vuelve a pedir', () => {
    const change = batch([{ workspace: 'equipo' }])
    expect(shouldRefresh(['me'], change)).toBe(false)
    expect(shouldRefresh(['github', 'me'], change)).toBe(false)
    expect(shouldRefresh(['fileUrl', 'abc', 'inline'], change)).toBe(false)
    expect(shouldRefresh(['search', 'equipo', 'login'], change)).toBe(false)
    expect(shouldRefresh(['notifications', 'counts'], change)).toBe(false)
  })

  it('un cambio del workspace entero (GitHub, una importación) refresca todo lo que se ve de él', () => {
    const change = batch([{ workspace: 'equipo' }])
    expect(shouldRefresh(['issues', P, {}], change)).toBe(true)
    expect(shouldRefresh(['issue', ISSUE], change)).toBe(true)
    expect(shouldRefresh(['workspaces'], change)).toBe(false)
  })

  it('un cambio de otro workspace no toca lo que está en pantalla', () => {
    const change = batch([{ workspace: 'otro-equipo' }])
    expect(shouldRefresh(['issues', P, {}], change)).toBe(false)
    expect(shouldRefresh(['issue', ISSUE], change)).toBe(false)
    expect(shouldRefresh(['projects', 'otro-equipo'], change)).toBe(true)
  })

  it('las notificaciones solo con su aviso; tras una caída, todo', () => {
    expect(shouldRefresh(['notifications', 'unread-count'], batch([], { notifications: true }))).toBe(true)
    expect(shouldRefresh(['issues', OTHER, {}], batch([], { notifications: true }))).toBe(false)
    expect(shouldRefresh(['issues', OTHER, {}], batch([], { everything: true }))).toBe(true)
    expect(shouldRefresh(['notifications', 'counts'], batch([], { everything: true }))).toBe(true)
    expect(shouldRefresh(['me'], batch([], { everything: true }))).toBe(false)
  })

  it('en la Bandeja (fuera de un workspace) la tarea abierta al lado se refresca igual', () => {
    const change = batch([{ workspace: 'equipo', projectId: P }], { currentSlug: undefined })
    expect(shouldRefresh(['comments', ISSUE], change)).toBe(true)
    expect(shouldRefresh(['issue', ISSUE], change)).toBe(true)
  })

  it('el workspace en pantalla sale de la ruta', () => {
    expect(slugOf('/equipo-producto/projects/x/issues')).toBe('equipo-producto')
    expect(slugOf('/profile')).toBeUndefined()
    expect(slugOf('/')).toBeUndefined()
  })
})

/** Una respuesta de avisos que se va escribiendo: `push` agrega texto y `end` la cierra. */
function stream() {
  const encoder = new TextEncoder()
  let controller
  const body = new ReadableStream({ start: (c) => (controller = c) })
  return {
    response: { ok: true, status: 200, body },
    push: (text) => controller.enqueue(encoder.encode(text)),
    end: () => controller.close(),
  }
}

describe('startRealtime', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'authenticated', accessToken: 'token-1' })
    refreshSession.mockReset().mockImplementation(async () => {
      useSessionStore.setState({ accessToken: 'token-2' })
      return 'token-2'
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('entrega los avisos, se reconecta sola cuando el servidor cierra y pide refrescar todo si estuvo caída', async () => {
    vi.useFakeTimers()
    const first = stream()
    const second = stream()
    const fetch = vi.fn().mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)
    vi.stubGlobal('fetch', fetch)
    const onEvent = vi.fn()
    const onReconnect = vi.fn()
    const stop = startRealtime({ onEvent, onReconnect })
    await vi.advanceTimersByTimeAsync(0)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]
    expect(url).toMatch(/\/events$/)
    expect(init.headers.Authorization).toBe('Bearer token-1')

    first.push('event:ready\ndata:{}\n\nevent:change\ndata:{"workspace":"equipo"}\n\n')
    await vi.advanceTimersByTimeAsync(0)
    expect(onEvent).toHaveBeenCalledWith({ event: 'change', data: { workspace: 'equipo' } })
    expect(onReconnect).not.toHaveBeenCalled()

    // El servidor cierra (un despliegue) y vuelve tras unos segundos: pudo perderse algo
    first.end()
    await vi.advanceTimersByTimeAsync(5_000)
    second.push('event:ready\ndata:{}\n\n')
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(onReconnect).toHaveBeenCalledTimes(1)
    stop()
  })

  it('con el token vencido lo renueva y vuelve a conectar', async () => {
    const live = stream()
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, body: null })
      .mockResolvedValueOnce(live.response)
    vi.stubGlobal('fetch', fetch)
    const stop = startRealtime({ onEvent: vi.fn(), onReconnect: vi.fn() })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer token-2')
    stop()
  })
})
