import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/stores/sessionStore'
import { useInvitationDetails } from '../hooks'
import { InvitationPage } from './InvitationPage'

vi.mock('../hooks', () => ({
  useInvitationDetails: vi.fn(),
  useAcceptInvitation: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/auth/hooks', () => ({ useLogout: () => ({ mutate: vi.fn(), isPending: false }) }))

const invitation = (role) => ({
  workspaceName: 'Acme',
  email: 'nuevo@test.com',
  role,
  invitedByName: 'Ana',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/invitations/tok']}>
      <Routes>
        <Route path="/invitations/:token" element={<InvitationPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useSessionStore.setState({ status: 'anonymous', user: null, accessToken: null })
})

describe('InvitationPage: el rol', () => {
  it('se muestra como «Miembro», nunca «MEMBER»', () => {
    useInvitationDetails.mockReturnValue({ data: invitation('MEMBER'), isLoading: false, error: null })
    renderPage()
    expect(screen.getByText(/^Miembro · crear y editar tareas$/)).toBeInTheDocument()
    expect(screen.queryByText(/MEMBER/)).not.toBeInTheDocument()
  })

  it('y el de project manager como «Project manager»', () => {
    useInvitationDetails.mockReturnValue({ data: invitation('OWNER'), isLoading: false, error: null })
    renderPage()
    expect(screen.getByText(/^Project manager · gestionar/)).toBeInTheDocument()
    expect(screen.queryByText(/OWNER/)).not.toBeInTheDocument()
  })
})
