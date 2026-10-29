import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ApiError } from '@/lib/errors'
import { InvitationsSettings } from './InvitationsSettings'

const invite = vi.fn()
vi.mock('../hooks', () => ({
  useInvite: () => ({ mutate: invite, isPending: false }),
  useInvitations: () => ({ data: [], isLoading: false }),
  useRevokeInvitation: () => ({ mutate: vi.fn(), isPending: false }),
}))
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
