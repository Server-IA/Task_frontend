import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '@/app/guards/RequireAuth'
import { pendingInvitation } from '@/lib/pendingInvitation'
import { tokenStorage } from '@/lib/tokenStorage'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { authApi } from './api'
import { useLogout } from './hooks'

vi.mock('./api', () => ({ authApi: { logout: vi.fn() }, userApi: {} }))

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  tokenStorage.set('refresh-1')
  useSessionStore.setState({ status: 'authenticated', accessToken: 'a', user: { id: 'u1' }, loggedOut: false })
  usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })
})

describe('useLogout', () => {
  it('revoca el token y olvida lo del usuario: último workspace e invitación pendiente', async () => {
    authApi.logout.mockResolvedValue({})
    pendingInvitation.set('tok-1')
    const queryClient = new QueryClient()
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useLogout(), { wrapper })

    await act(() => result.current.mutateAsync())

    expect(authApi.logout).toHaveBeenCalledWith('refresh-1')
    expect(useSessionStore.getState()).toMatchObject({ status: 'anonymous', loggedOut: true })
    expect(tokenStorage.get()).toBeNull()
    expect(usePreferencesStore.getState().lastWorkspaceSlug).toBeNull()
    expect(pendingInvitation.get()).toBeNull()
  })
})

describe('RequireAuth', () => {
  function LoginProbe() {
    const location = useLocation()
    return <p>login · from: {location.state?.from?.pathname ?? 'ninguno'}</p>
  }

  function renderApp() {
    const router = createMemoryRouter(
      [
        { path: '/login', element: <LoginProbe /> },
        { element: <RequireAuth />, children: [{ path: '/acme/projects/p1/issues', element: <LogoutButton /> }] },
      ],
      { initialEntries: ['/acme/projects/p1/issues'] },
    )
    const queryClient = new QueryClient()
    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
  }

  function LogoutButton() {
    const logout = useLogout()
    return (
      <button type="button" onClick={() => logout.mutate()}>
        Cerrar sesión
      </button>
    )
  }

  it('tras cerrar sesión, el login no recuerda la página del usuario anterior', async () => {
    authApi.logout.mockResolvedValue({})
    renderApp()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(await screen.findByText('login · from: ninguno')).toBeInTheDocument()
  })

  it('si la sesión venció (no se cerró a propósito), sí la recuerda', async () => {
    renderApp()
    act(() => useSessionStore.getState().clearSession())
    expect(await screen.findByText('login · from: /acme/projects/p1/issues')).toBeInTheDocument()
  })
})
