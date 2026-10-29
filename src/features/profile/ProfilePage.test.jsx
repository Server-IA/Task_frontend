import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/errors'
import { ProfilePage } from './ProfilePage'

const changePassword = vi.fn()
vi.mock('@/features/auth/hooks', () => ({
  useMe: () => ({ data: { id: 'u1', fullName: 'Ana Pérez', email: 'ana@correo.com' }, isLoading: false }),
  useChangePassword: () => ({ mutate: changePassword, isPending: false }),
  useUpdateProfile: () => ({ mutate: vi.fn(), isPending: false }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspaces: () => ({ data: [] }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('Cambiar contraseña', () => {
  it('tras un 429 el botón espera lo que indica Retry-After', async () => {
    const user = userEvent.setup()
    changePassword.mockImplementation((_body, { onError }) =>
      onError(new ApiError({ status: 429, message: 'Demasiados intentos', retryAfter: 30 })),
    )
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Contraseña actual'), 'vieja1234')
    await user.type(screen.getByLabelText('Nueva contraseña'), 'nueva1234')
    await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'nueva1234')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(toast.warning).toHaveBeenCalledWith('Demasiados intentos', expect.anything())
    expect(await screen.findByRole('button', { name: 'Espera 30 s' })).toBeDisabled()
  })

  it('el botón usa el estilo primario (crema), como los demás botones principales', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    )
    const button = screen.getByRole('button', { name: 'Cambiar contraseña' })
    expect(button).toHaveAttribute('data-variant', 'default')
    expect(button).toHaveClass('bg-primary')
    expect(button).not.toHaveClass('bg-foreground')
  })
})
