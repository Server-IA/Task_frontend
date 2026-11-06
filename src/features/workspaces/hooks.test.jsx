import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { ApiError } from '@/lib/errors'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { workspacesApi } from './api'
import { forgetWorkspace, resolveLastWorkspace, useDeleteWorkspace, useLastWorkspaceSlug, useRemoveMember, useWorkspace } from './hooks'
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
  usePreferencesStore.setState({ lastWorkspaceSlug: null, lastWorkspaceId: null })
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

describe('forgetWorkspace con la página vieja todavía a la vista', () => {
  it('no vuelve a pedir lo que la página muestra (sería un 403): lo borra cuando la página se va', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [acme, beta])
    queryClient.setQueryData(queryKeys.workspace('acme'), acme)
    workspacesApi.list.mockReturnValue(new Promise(() => {}))
    const { rerender, unmount } = renderHook(() => useWorkspace('acme'), { wrapper: wrapperFor(queryClient) })

    act(() => forgetWorkspace(queryClient, 'acme'))
    // La página vieja se vuelve a dibujar antes de irse
    rerender()
    rerender()
    expect(workspacesApi.get).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([beta])

    unmount()
    expect(queryClient.getQueryCache().find({ queryKey: queryKeys.workspace('acme') })).toBeUndefined()
    expect(workspacesApi.get).not.toHaveBeenCalled()
  })

  it('al eliminar, olvida el workspace antes de navegar', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [acme, beta])
    workspacesApi.remove.mockResolvedValue({})
    workspacesApi.list.mockReturnValue(new Promise(() => {}))
    let listWhenLeaving = null
    const onGone = () => {
      listWhenLeaving = queryClient.getQueryData(queryKeys.workspaces)
    }
    const { result } = renderHook(() => useDeleteWorkspace('acme', { onGone }), { wrapper: wrapperFor(queryClient) })
    await act(() => result.current.mutateAsync())
    expect(listWhenLeaving).toEqual([beta])
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

describe('useRemoveMember', () => {
  it('quitar a otro miembro recarga los miembros de los proyectos y las tarjetas del inicio', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.projectMembers('p1'), [{ user: { id: 'otro' } }])
    queryClient.setQueryData(queryKeys.projectMembers('p2'), [])
    queryClient.setQueryData(queryKeys.projects('acme'), [{ id: 'p1', memberCount: 1, members: [{ id: 'otro' }] }])
    workspacesApi.removeMember.mockResolvedValue({})
    workspacesApi.list.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useRemoveMember('acme'), { wrapper: wrapperFor(queryClient) })

    await act(() => result.current.mutateAsync('otro'))
    expect(queryClient.getQueryState(queryKeys.projectMembers('p1')).isInvalidated).toBe(true)
    expect(queryClient.getQueryState(queryKeys.projectMembers('p2')).isInvalidated).toBe(true)
    expect(queryClient.getQueryState(queryKeys.projects('acme')).isInvalidated).toBe(true)
  })
})

describe('useLastWorkspaceSlug', () => {
  it('si ya no es miembro del último, usa uno suyo (el primero) en vez de quedarse sin enlaces', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [beta])
    workspacesApi.list.mockResolvedValue([beta])
    usePreferencesStore.setState({ lastWorkspaceSlug: 'gone' })
    const { result } = renderHook(() => useLastWorkspaceSlug(), { wrapper: wrapperFor(queryClient) })
    expect(result.current).toBe('beta')
  })

  it('sin workspaces, null', () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [])
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })
    const { result } = renderHook(() => useLastWorkspaceSlug(), { wrapper: wrapperFor(queryClient) })
    expect(result.current).toBeNull()
  })

  it('si un project manager le cambió la URL, lo encuentra por su id, recarga el listado y guarda el slug nuevo', async () => {
    const queryClient = client()
    const renamed = { id: 'w-acme', slug: 'acme-studio', name: 'Acme' }
    queryClient.setQueryData(queryKeys.workspaces, [{ id: 'w-beta', ...beta }, renamed])
    workspacesApi.list.mockResolvedValue([{ id: 'w-beta', ...beta }, renamed])
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme-stale', lastWorkspaceId: 'w-acme' })
    const { result } = renderHook(() => useLastWorkspaceSlug(), { wrapper: wrapperFor(queryClient) })

    expect(result.current).toBe('acme-studio')
    await waitFor(() => expect(usePreferencesStore.getState().lastWorkspaceSlug).toBe('acme-studio'))
    expect(workspacesApi.list).toHaveBeenCalledTimes(1)
  })

  it('con el listado en caché viejo, al no encontrarlo lo recarga y toma el slug nuevo', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [{ id: 'w-beta', ...beta }])
    workspacesApi.list.mockResolvedValue([{ id: 'w-beta', ...beta }, { id: 'w-acme', slug: 'acme-2', name: 'Acme' }])
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme-old', lastWorkspaceId: 'w-acme' })
    const { result } = renderHook(() => useLastWorkspaceSlug(), { wrapper: wrapperFor(queryClient) })

    await waitFor(() => expect(result.current).toBe('acme-2'))
  })
})

describe('resolveLastWorkspace', () => {
  const list = [{ id: '1', slug: 'uno' }, { id: '2', slug: 'dos' }]
  it('por slug, por id o el primero', () => {
    expect(resolveLastWorkspace(list, { slug: 'dos', id: '1' }).slug).toBe('dos')
    expect(resolveLastWorkspace(list, { slug: 'viejo', id: '2' }).slug).toBe('dos')
    expect(resolveLastWorkspace(list, { slug: 'viejo', id: null }).slug).toBe('uno')
    expect(resolveLastWorkspace([], { slug: 'uno' })).toBeNull()
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

  it('con un slug que ya no existe (404) recarga el listado y conserva el id para encontrarlo con su URL nueva', async () => {
    const queryClient = client()
    queryClient.setQueryData(queryKeys.workspaces, [acme])
    usePreferencesStore.setState({ lastWorkspaceSlug: 'acme', lastWorkspaceId: 'w-acme' })
    workspacesApi.get.mockRejectedValue(new ApiError({ status: 404, message: 'Workspace no encontrado' }))
    renderLayout(queryClient)
    await waitFor(() => expect(usePreferencesStore.getState().lastWorkspaceSlug).toBeNull())
    expect(usePreferencesStore.getState().lastWorkspaceId).toBe('w-acme')
    expect(queryClient.getQueryState(queryKeys.workspaces).isInvalidated).toBe(true)
  })

  it('al abrirlo recuerda su slug y su id', async () => {
    workspacesApi.get.mockResolvedValue({ id: 'w-acme', ...acme })
    renderLayout(client())
    await waitFor(() => expect(usePreferencesStore.getState()).toMatchObject({ lastWorkspaceSlug: 'acme', lastWorkspaceId: 'w-acme' }))
  })
})
