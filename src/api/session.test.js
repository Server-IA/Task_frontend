import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { refreshSession } from '@/api/session'
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
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), { refreshToken: 'refresh-0' })
    expect(tokens).toEqual(['access-1', 'access-1', 'access-1'])
    expect(tokenStorage.get()).toBe('refresh-1')
  })

  it('usa el token rotado en el siguiente refresh', async () => {
    axios.post.mockResolvedValueOnce({ data: authResponse(1) }).mockResolvedValueOnce({ data: authResponse(2) })

    await refreshSession()
    await refreshSession()

    expect(axios.post).toHaveBeenNthCalledWith(2, expect.any(String), { refreshToken: 'refresh-1' })
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
})
