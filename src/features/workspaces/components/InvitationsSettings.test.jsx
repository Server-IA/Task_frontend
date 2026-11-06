import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ApiError } from '@/lib/errors'
import { InvitationsSettings } from './InvitationsSettings'

const invite = vi.fn()
const revoke = vi.fn()
let invitations = []
vi.mock('../hooks', () => ({
  useInvite: () => ({ mutate: invite, isPending: false }),
  useInvitations: () => ({ data: invitations, isLoading: false }),
  useRevokeInvitation: () => ({ mutate: revoke, isPending: false }),
}))
beforeAll(() => {
  // El tooltip del botón (al tomar el foco) se mide con ResizeObserver, que jsdom no trae
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

describe('Invitar personas', () => {
  it('tras un 429 el botón espera lo que indica Retry-After', async () => {
    const user = userEvent.setup()
    invite.mockImplementation((_body, { onError }) =>
      onError(new ApiError({ status: 429, message: 'Demasiadas invitaciones', retryAfter: 45 })),
    )
    render(
      <TooltipProvider>
        <InvitationsSettings workspace={{ slug: 'acme', name: 'Acme', myRole: 'OWNER' }} />
      </TooltipProvider>,
    )

    await user.type(screen.getByLabelText('Correo'), 'luis@correo.com')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(toast.warning).toHaveBeenCalledWith('Demasiados intentos', { description: 'Espera 45 segundos antes de volver a intentarlo.' })
    expect(await screen.findByRole('button', { name: 'Espera 45 s' })).toBeDisabled()
  })
})

describe('Cancelar una invitación', () => {
  const invitation = (id, email) => ({ id, email, createdAt: '2026-11-01T00:00:00Z', expiresAt: '2026-11-08T00:00:00Z' })
  const workspace = { slug: 'acme', name: 'Acme', myRole: 'OWNER' }
  const ui = () => (
    <TooltipProvider>
      <InvitationsSettings workspace={workspace} />
    </TooltipProvider>
  )

  it('el foco pasa a la invitación que queda en su lugar, no al body', async () => {
    const user = userEvent.setup()
    invitations = [invitation('i1', 'ana@correo.com'), invitation('i2', 'luis@correo.com')]
    revoke.mockImplementation((_id, { onSuccess }) => onSuccess())
    const { rerender } = render(ui())
    await user.click(screen.getByRole('button', { name: 'Cancelar invitación a ana@correo.com' }))

    // La lista se recarga sin ella
    invitations = [invitation('i2', 'luis@correo.com')]
    rerender(ui())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar invitación a luis@correo.com' })).toHaveFocus())
  })

  it('si era la última, el foco va al título de la tarjeta', async () => {
    const user = userEvent.setup()
    invitations = [invitation('i1', 'ana@correo.com')]
    revoke.mockImplementation((_id, { onSuccess }) => onSuccess())
    const { rerender } = render(ui())
    await user.click(screen.getByRole('button', { name: 'Cancelar invitación a ana@correo.com' }))

    invitations = []
    rerender(ui())
    await waitFor(() => expect(screen.getByText('Invitaciones pendientes')).toHaveFocus())
  })
})
