import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { restoreSession } from '@/api/session'
import { tokenStorage } from '@/lib/tokenStorage'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { RequireAuth } from './guards/RequireAuth'
import { SessionGate } from './SessionGate'

vi.mock('@/api/session', () => ({ restoreSession: vi.fn(), listenToOtherTabs: () => () => {}, withSessionLock: vi.fn() }))

function renderGate() {
  const router = createMemoryRouter([
    { path: '/', element: <SessionGate />, children: [{ element: <RequireAuth />, children: [{ index: true, element: <p>app</p> }] }] },
    { path: '/login', element: <p>login</p> },
  ])
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router }
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

  it('si el servidor sigue fallando, «Iniciar sesión de nuevo» olvida el token y lleva al login', async () => {
    tokenStorage.set('refresh-viejo')
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })
    useSessionStore.setState({ status: 'offline' })
    const { router } = renderGate()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Iniciar sesión de nuevo' }))
    expect(await screen.findByText('login')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(tokenStorage.get()).toBeNull()
    expect(useSessionStore.getState().status).toBe('anonymous')
    expect(usePreferencesStore.getState().lastWorkspaceSlug).toBeNull()
  })

  it('reintenta solo cuando vuelve la conexión', () => {
    useSessionStore.setState({ status: 'offline' })
    renderGate()
    restoreSession.mockClear()
    window.dispatchEvent(new Event('online'))
    expect(restoreSession).toHaveBeenCalledTimes(1)
  })
})
