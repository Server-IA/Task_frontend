import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { SESSION_EXPIRED, SESSION_EXPIRED_MESSAGE } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { useSessionStore } from '@/stores/sessionStore'

const refresh = vi.hoisted(() => ({ fail: null }))
vi.mock('@/api/session', () => ({
  refreshSession: vi.fn(async () => {
    refresh.fail()
    throw new Error('refresh rechazado')
  }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))

/** Respuesta 401 del backend (sin `message`: antes salía «Ocurrió un error inesperado»). */
const unauthorized = (config) => Promise.reject(Object.assign(new Error('401'), { config, response: { status: 401, data: {}, headers: {} } }))

describe('cliente: el refresh falla', () => {
  const adapter = api.defaults.adapter
  beforeEach(() => {
    api.defaults.adapter = unauthorized
    useSessionStore.setState({ status: 'authenticated', accessToken: 'viejo', user: null })
  })
  afterEach(() => {
    api.defaults.adapter = adapter
    vi.clearAllMocks()
  })

  it('con la sesión cerrada (venció), el error dice que expiró y no se avisa con un toast', async () => {
    refresh.fail = () => useSessionStore.getState().clearSession({ expired: true })

    const error = await api.post('/issues').catch((caught) => caught)

    expect(error).toMatchObject({ status: 401, code: SESSION_EXPIRED, message: SESSION_EXPIRED_MESSAGE })
    expect(notifyError(error, 'No se pudo guardar')).toBe(0)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('si el refresh falló sin cerrar la sesión (sin red), el error sigue siendo el de siempre y se avisa', async () => {
    refresh.fail = () => {}

    const error = await api.post('/issues').catch((caught) => caught)

    expect(error.code).not.toBe(SESSION_EXPIRED)
    notifyError(error, 'No se pudo guardar')
    expect(toast.error).toHaveBeenCalled()
  })
})
