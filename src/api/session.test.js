import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshSession, restoreSession, withSessionLock } from '@/api/session'
import { tokenStorage } from '@/lib/tokenStorage'
import { useSessionStore } from '@/stores/sessionStore'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal()
  return { default: { ...actual.default, post: vi.fn() } }
})

const authResponse = (n) => ({
  accessToken: `access-${n}`,
  refreshToken: `refresh-${n}`,
  user: { id: 'u1', fullName: 'Ana', email: 'ana@test.com' },
})

describe('refreshSession', () => {
  beforeEach(() => {
    localStorage.clear()
    tokenStorage.set('refresh-0')
    useSessionStore.setState({ status: 'authenticated', accessToken: 'viejo', user: null })
  })

  afterEach(() => vi.clearAllMocks())

  it('hace una sola petición aunque varias llamadas lleguen a la vez', async () => {
    let resolve
    axios.post.mockReturnValue(new Promise((r) => (resolve = r)))

    const calls = [refreshSession(), refreshSession(), refreshSession()]
    resolve({ data: authResponse(1) })
    const tokens = await Promise.all(calls)

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refreshToken: 'refresh-0' },
      { timeout: 15_000 },
    )
    expect(tokens).toEqual(['access-1', 'access-1', 'access-1'])
    expect(tokenStorage.get()).toBe('refresh-1')
  })

  it('usa el token rotado en el siguiente refresh', async () => {
    axios.post.mockResolvedValueOnce({ data: authResponse(1) }).mockResolvedValueOnce({ data: authResponse(2) })

    await refreshSession()
    await refreshSession()

    expect(axios.post).toHaveBeenNthCalledWith(2, expect.any(String), { refreshToken: 'refresh-1' }, expect.anything())
  })

  it('cierra la sesión si el backend rechaza el refresh token', async () => {
    axios.post.mockRejectedValue({ response: { status: 401, data: { message: 'Refresh token inválido' } } })

    await expect(refreshSession()).rejects.toBeTruthy()
    expect(useSessionStore.getState().status).toBe('anonymous')
    expect(tokenStorage.get()).toBeNull()
  })

  it('conserva la sesión si el fallo es de red', async () => {
    axios.post.mockRejectedValue(new Error('Network Error'))

    await expect(refreshSession()).rejects.toBeTruthy()
    expect(tokenStorage.get()).toBe('refresh-0')
  })

  it('tiene un tope de tiempo: corre dentro de un lock compartido por las pestañas', async () => {
    axios.post.mockResolvedValue({ data: authResponse(1) })
    await refreshSession()
    expect(axios.post.mock.calls[0][2]).toEqual({ timeout: 15_000 })
  })

  it('si otra pestaña guardó un token nuevo mientras tanto, no lo borra: reintenta con ese', async () => {
    axios.post
      .mockImplementationOnce(async () => {
        // Otra pestaña cambia la contraseña: el token viejo deja de servir y queda uno nuevo
        tokenStorage.set('refresh-otra')
        throw { response: { status: 401, data: { message: 'Refresh token inválido' } } }
      })
      .mockResolvedValueOnce({ data: authResponse(2) })

    await expect(refreshSession()).resolves.toBe('access-2')
    expect(axios.post).toHaveBeenNthCalledWith(2, expect.any(String), { refreshToken: 'refresh-otra' }, expect.anything())
    expect(tokenStorage.get()).toBe('refresh-2')
    expect(useSessionStore.getState().status).toBe('authenticated')
  })

  it('si la sesión se cerró mientras volaba el refresh, descarta su resultado', async () => {
    let resolve
    axios.post.mockReturnValue(new Promise((r) => (resolve = r)))
    const pending = refreshSession()
    useSessionStore.getState().clearSession({ loggedOut: true })
    resolve({ data: authResponse(1) })

    await expect(pending).rejects.toBeTruthy()
    expect(tokenStorage.get()).toBeNull()
    expect(useSessionStore.getState().status).toBe('anonymous')
  })

  it('withSessionLock espera al refresh en curso y lee el token ya rotado (logout)', async () => {
    let resolve
    axios.post.mockReturnValue(new Promise((r) => (resolve = r)))
    refreshSession()
    const read = withSessionLock(async () => tokenStorage.get())
    resolve({ data: authResponse(1) })

    await expect(read).resolves.toBe('refresh-1')
  })
})

describe('restoreSession', () => {
  beforeEach(() => {
    localStorage.clear()
    tokenStorage.set('refresh-0')
    useSessionStore.setState({ status: 'loading', accessToken: null, user: null })
  })

  afterEach(() => vi.clearAllMocks())

  it('sin red al abrir la app conserva el token y queda «offline» para reintentar', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network Error'))
    await restoreSession()
    expect(useSessionStore.getState().status).toBe('offline')
    expect(tokenStorage.get()).toBe('refresh-0')

    axios.post.mockResolvedValueOnce({ data: authResponse(1) })
    await restoreSession()
    expect(useSessionStore.getState().status).toBe('authenticated')
  })
})
