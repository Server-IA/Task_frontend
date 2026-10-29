import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/errors'
import { authApi } from '../api'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('../api', () => ({
  authApi: { validateResetToken: vi.fn(), resetPassword: vi.fn() },
  userApi: {},
}))

function renderReset(url = '/reset-password?token=tok-1') {
  const router = createMemoryRouter([{ path: '/reset-password', element: <ResetPasswordPage /> }], {
    initialEntries: [url],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('ResetPasswordPage', () => {
  afterEach(() => vi.clearAllMocks())

  it('comprueba el enlace al abrir: mientras tanto muestra un loader y después el formulario', async () => {
    let resolve
    authApi.validateResetToken.mockReturnValue(new Promise((done) => (resolve = done)))
    const router = renderReset()

    expect(await screen.findByText('Comprobando el enlace…')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
    expect(authApi.validateResetToken).toHaveBeenCalledWith('tok-1')
    // El token ya no está en la URL (ni en el historial)
    expect(router.state.location.search).toBe('')

    resolve(true)

    expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument()
    expect(screen.queryByText('Comprobando el enlace…')).not.toBeInTheDocument()
    expect(authApi.validateResetToken).toHaveBeenCalledTimes(1)
  })

  it('con un enlace vencido o usado muestra el aviso y el enlace para pedir otro, no el formulario', async () => {
    authApi.validateResetToken.mockRejectedValue(
      new ApiError({ status: 400, message: 'El enlace para restablecer la contraseña no es válido o ya expiró' }),
    )
    const router = renderReset()

    expect(await screen.findByText('Este enlace no es válido o ya venció')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('sin token en la URL no llama a la API y muestra el aviso', async () => {
    renderReset('/reset-password')

    expect(await screen.findByText('Este enlace no es válido o ya venció')).toBeInTheDocument()
    expect(authApi.validateResetToken).not.toHaveBeenCalled()
  })

  it('si la comprobación falla por otra causa (red) deja usar el formulario', async () => {
    authApi.validateResetToken.mockRejectedValue(new ApiError({ status: 0, message: 'Sin conexión' }))
    renderReset()

    expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument()
    expect(screen.queryByText('Este enlace no es válido o ya venció')).not.toBeInTheDocument()
  })
})
