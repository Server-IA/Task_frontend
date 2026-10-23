import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/errors'
import { authApi } from '../api'
import { LoginPage } from './LoginPage'

vi.mock('../api', () => ({
  authApi: { login: vi.fn(), resendVerification: vi.fn() },
  userApi: {},
}))

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function submit(email, password) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Correo'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
}

describe('LoginPage', () => {
  afterEach(() => vi.clearAllMocks())

  it('valida los campos antes de llamar a la API', async () => {
    renderLogin()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Iniciar sesión' }))

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
