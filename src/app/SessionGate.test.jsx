import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { restoreSession } from '@/api/session'
import { useSessionStore } from '@/stores/sessionStore'
import { SessionGate } from './SessionGate'

vi.mock('@/api/session', () => ({ restoreSession: vi.fn(), listenToOtherTabs: () => () => {} }))

function renderGate() {
  const router = createMemoryRouter([{ path: '/', element: <SessionGate />, children: [{ index: true, element: <p>app</p> }] }])
  return render(<RouterProvider router={router} />)
}

describe('SessionGate', () => {
  it('si el backend no respondió al abrir, ofrece reintentar en vez de mandar al login', async () => {
    useSessionStore.setState({ status: 'offline' })
    renderGate()
    expect(screen.getByText('Sin conexión con el servidor')).toBeInTheDocument()
    restoreSession.mockClear()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(restoreSession).toHaveBeenCalledTimes(1)
  })

  it('reintenta solo cuando vuelve la conexión', () => {
    useSessionStore.setState({ status: 'offline' })
    renderGate()
    restoreSession.mockClear()
    window.dispatchEvent(new Event('online'))
    expect(restoreSession).toHaveBeenCalledTimes(1)
  })
})
