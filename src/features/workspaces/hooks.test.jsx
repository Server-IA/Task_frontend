import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { ApiError } from '@/lib/errors'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { workspacesApi } from './api'
import { forgetWorkspace, useDeleteWorkspace, useLastWorkspaceSlug, useRemoveMember } from './hooks'
import { HomeRedirect } from './pages/HomeRedirect'
import { WorkspaceLayout } from './pages/WorkspaceLayout'

vi.mock('./api', () => ({
  workspacesApi: { list: vi.fn(), get: vi.fn(), remove: vi.fn(), removeMember: vi.fn() },
  invitationsApi: {},
}))

const acme = { slug: 'acme', name: 'Acme' }
const beta = { slug: 'beta', name: 'Beta' }

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
}
const wrapperFor = (queryClient) =>
  function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

beforeEach(() => {
  vi.resetAllMocks()
  usePreferencesStore.setState({ lastWorkspaceSlug: null })
  useSessionStore.setState({ status: 'authenticated', user: { id: 'u1' }, accessToken: 'x' })
})

describe('forgetWorkspace', () => {
  it('lo saca del listado y borra lo suyo del caché', () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [acme, beta])
    queryClient.setQueryData(queryKeys.workspace('acme'), acme)
    queryClient.setQueryData(queryKeys.projects('acme'), [])
    queryClient.setQueryData(queryKeys.myWork('acme', 'all'), [])
    queryClient.setQueryData(queryKeys.projects('beta'), [])
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })

    forgetWorkspace(queryClient, 'acme')

    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([beta])
    expect(queryClient.getQueryData(queryKeys.workspace('acme'))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.projects('acme'))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.myWork('acme', 'all'))).toBeUndefined()
    expect(queryClient.getQueryData(queryKeys.projects('beta'))).toEqual([])
    expect(usePreferencesStore.getState().lastWorkspaceSlug).toBeNull()
  })
})

describe('eliminar o salir de un workspace', () => {
  it('al eliminar el único workspace, «/» lleva al onboarding (no de vuelta al eliminado)', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [acme])
    workspacesApi.remove.mockResolvedValue({})
    // La recarga del listado tarda: «/» tiene que decidir con el caché
    workspacesApi.list.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useDeleteWorkspace('acme'), { wrapper: wrapperFor(queryClient) })
    await act(() => result.current.mutateAsync())

    const router = createMemoryRouter(
      [
        { path: '/', element: <HomeRedirect /> },
        { path: '/onboarding', element: <p>onboarding</p> },
        { path: '/:slug', element: <p>workspace</p> },
      ],
      { initialEntries: ['/'] },
    )
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('onboarding')).toBeInTheDocument()
  })

  it('salir (quitarse a uno mismo) también lo olvida; quitar a otro miembro, no', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [acme, beta])
    queryClient.setQueryData(queryKeys.workspace('acme'), acme)
    workspacesApi.removeMember.mockResolvedValue({})
    workspacesApi.list.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useRemoveMember('acme'), { wrapper: wrapperFor(queryClient) })

    await act(() => result.current.mutateAsync('otro'))
    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([acme, beta])

    await act(() => result.current.mutateAsync('u1'))
    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([beta])
    expect(queryClient.getQueryData(queryKeys.workspace('acme'))).toBeUndefined()
  })
})

describe('useLastWorkspaceSlug', () => {
  it('solo devuelve el último workspace si el usuario sigue siendo miembro', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [beta])
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })
    const { result, rerender } = renderHook(() => useLastWorkspaceSlug(), { wrapper: wrapperFor(queryClient) })
    expect(result.current).toBeNull()

    act(() => usePreferencesStore.setState({ lastWorkspaceSlug: 'beta' }))
    rerender()
    expect(result.current).toBe('beta')
  })
})

describe('WorkspaceLayout', () => {
  function renderLayout(queryClient) {
    const router = createMemoryRouter([{ path: '/:slug', element: <WorkspaceLayout /> }], { initialEntries: ['/acme'] })
    return render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
  }

  it('un error de red o del servidor no olvida el último workspace', async () => {
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })
    workspacesApi.get.mockRejectedValue(new ApiError({ status: 503, message: 'Servicio no disponible' }))
    renderLayout(client())
    await screen.findByText('Servicio no disponible')
    expect(usePreferencesStore.getState().lastWorkspaceSlug).toBe('acme')
  })

  it('sin acceso (403) sí lo olvida', async () => {
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })
    workspacesApi.get.mockRejectedValue(new ApiError({ status: 403, message: 'Sin acceso' }))
    renderLayout(client())
    await waitFor(() => expect(usePreferencesStore.getState().lastWorkspaceSlug).toBeNull())
  })
})
