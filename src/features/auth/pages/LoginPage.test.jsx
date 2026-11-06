import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/errors'
import { authApi } from '../api'
import { useSessionStore } from '@/stores/sessionStore'
import { LoginPage } from './LoginPage'

vi.mock('../api', () => ({
  authApi: { login: vi.fn(), resendVerification: vi.fn() },
  userApi: {},
}))

function renderLogin(entry = '/login') {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function submit(email, password) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Correo'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: /^Entrar/ }))
}

describe('LoginPage', () => {
  afterEach(() => vi.clearAllMocks())

  it('valida los campos antes de llamar a la API', async () => {
    renderLogin()
    await userEvent.setup().click(screen.getByRole('button', { name: /^Entrar/ }))

    expect(await screen.findByText('El correo es obligatorio')).toBeInTheDocument()
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('tras un 429 deshabilita el botón con la cuenta regresiva de Retry-After', async () => {
    authApi.login.mockRejectedValue(new ApiError({ status: 429, message: 'Demasiados intentos', retryAfter: 42 }))
    renderLogin()

    await submit('ana@test.com', 'Clave1234')

    const button = await screen.findByRole('button', { name: /Espera 42 s/ })
    expect(button).toBeDisabled()
  })

  it('si el correo no está verificado ofrece reenviar la verificación', async () => {
    authApi.login.mockRejectedValue(
      new ApiError({ status: 403, message: 'Debes verificar tu correo antes de iniciar sesión' }),
    )
    renderLogin()

    await submit('ana@test.com', 'Clave1234')

    expect(await screen.findByText('Verifica tu correo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reenviar correo de verificación' })).toBeInTheDocument()
  })
})

describe('LoginPage: sesión vencida', () => {
  afterEach(() => useSessionStore.setState({ expired: false, loggedOut: false }))

  it('si la sesión venció lo dice (una sola vez) y que al entrar vuelve a donde estaba', () => {
    useSessionStore.getState().clearSession({ expired: true })
    const { unmount } = renderLogin({ pathname: '/login', state: { from: { pathname: '/acme/my-work' } } })

    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión expiró. Vuelve a iniciar sesión.')
    expect(screen.getByRole('status')).toHaveTextContent('Al entrar, vuelves a la página en la que estabas.')
    expect(useSessionStore.getState().expired).toBe(false)

    // Al volver al login más tarde ya no aparece
    unmount()
    renderLogin()
    expect(screen.queryByText(/Tu sesión expiró/)).not.toBeInTheDocument()
  })

  it('tras cerrar sesión a propósito no aparece', () => {
    useSessionStore.getState().clearSession({ loggedOut: true })
    renderLogin()
    expect(screen.queryByText(/Tu sesión expiró/)).not.toBeInTheDocument()
  })
})
