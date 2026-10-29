import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { ApiError } from '@/lib/errors'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useSessionStore } from '@/stores/sessionStore'
import { workspacesApi } from '../api'
import { useCurrentWorkspace } from '../hooks'
import { HomeRedirect } from '../pages/HomeRedirect'
import { WorkspaceLayout } from '../pages/WorkspaceLayout'
import { GeneralSettings } from './GeneralSettings'
import { WorkspaceForm } from './WorkspaceForm'

vi.mock('../api', () => ({
  workspacesApi: { list: vi.fn(), get: vi.fn(), remove: vi.fn(), removeMember: vi.fn(), members: vi.fn() },
  invitationsApi: {},
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const acme = { id: 'w1', slug: 'acme', name: 'Acme', myRole: 'OWNER' }
const beta = { id: 'w2', slug: 'beta', name: 'Beta', myRole: 'MEMBER' }

function SettingsRoute() {
  const workspace = useCurrentWorkspace()
  return <GeneralSettings workspace={workspace} />
}

/** La app real a escala: «/» elige workspace y /:slug pasa por WorkspaceLayout antes de los ajustes. */
function renderApp(workspaces) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
  queryClient.setQueryData(queryKeys.workspaces, workspaces)
  queryClient.setQueryData(queryKeys.workspace('acme'), acme)
  // Tras eliminar o salir, el workspace ya no se puede abrir; la recarga del listado tarda
  workspacesApi.get.mockImplementation(async (slug) => {
    const found = workspaces.find((workspace) => workspace.slug === slug && slug !== 'acme')
    if (found) return found
    throw new ApiError({ status: 404, message: 'No encontrado' })
  })
  workspacesApi.list.mockReturnValue(new Promise(() => {}))
  const router = createMemoryRouter(
    [
      { path: '/', element: <HomeRedirect /> },
      { path: '/onboarding', element: <p>onboarding</p> },
      {
        path: '/:slug',
        element: <WorkspaceLayout />,
        children: [
          { index: true, element: <p>inicio del workspace</p> },
          { path: 'settings', element: <SettingsRoute /> },
        ],
      },
    ],
    { initialEntries: ['/acme/settings'] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

beforeEach(() => {
  vi.resetAllMocks()
  usePreferencesStore.setState({ lastWorkspaceSlug: 'acme' })
  useSessionStore.setState({ status: 'authenticated', user: { id: 'u1' }, accessToken: 'x' })
})

describe('GeneralSettings dentro de WorkspaceLayout', () => {
  it('eliminar el workspace lleva a otro workspace (no se queda en «No encontrado»)', async () => {
    const user = userEvent.setup()
    workspacesApi.remove.mockResolvedValue({})
    const { router, queryClient } = renderApp([acme, beta])

    await user.click(screen.getByRole('button', { name: 'Eliminar workspace' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar definitivamente' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/beta'))
    expect(await screen.findByText('inicio del workspace')).toBeInTheDocument()
    expect(screen.queryByText('No encontrado')).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Workspace «Acme» eliminado')
    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([beta])
    expect(usePreferencesStore.getState().lastWorkspaceSlug).toBe('beta')
  })

  it('eliminar el único workspace lleva al onboarding', async () => {
    const user = userEvent.setup()
    workspacesApi.remove.mockResolvedValue({})
    const { router } = renderApp([acme])

    await user.click(screen.getByRole('button', { name: 'Eliminar workspace' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar definitivamente' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'))
    expect(usePreferencesStore.getState().lastWorkspaceSlug).toBeNull()
  })

  it('salir del workspace lleva a otro workspace (no se queda en «No tienes acceso»)', async () => {
    const user = userEvent.setup()
    workspacesApi.removeMember.mockResolvedValue({})
    const { router, queryClient } = renderApp([acme, beta])

    await user.click(screen.getByRole('button', { name: 'Salir del workspace' }))
    await user.click(await screen.findByRole('button', { name: 'Salir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/beta'))
    expect(await screen.findByText('inicio del workspace')).toBeInTheDocument()
    expect(workspacesApi.removeMember).toHaveBeenCalledWith('acme', 'u1')
    expect(toast.success).toHaveBeenCalledWith('Saliste de «Acme»')
    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([beta])
  })

  it('si falla, se queda en los ajustes y no olvida el workspace', async () => {
    const user = userEvent.setup()
    workspacesApi.remove.mockRejectedValue(new ApiError({ status: 500, message: 'Falló' }))
    const { router, queryClient } = renderApp([acme, beta])

    await user.click(screen.getByRole('button', { name: 'Eliminar workspace' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar definitivamente' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(router.state.location.pathname).toBe('/acme/settings')
    expect(queryClient.getQueryData(queryKeys.workspaces)).toEqual([acme, beta])
    expect(usePreferencesStore.getState().lastWorkspaceSlug).toBe('acme')
  })
})

describe('Salir siendo el único project manager', () => {
  const member = (id, role) => ({ user: { id, fullName: id }, role })

  it('avisa antes de intentarlo y no deja salir (el backend respondería 409)', async () => {
    workspacesApi.members.mockResolvedValue([member('u1', 'OWNER'), member('u2', 'MEMBER')])
    renderApp([acme, beta])

    expect(await screen.findByText(/Eres el único project manager de «Acme»/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir del workspace' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Miembros' })).toHaveAttribute('href', expect.stringContaining('tab=members'))
  })

  it('con otro project manager, sí deja salir', async () => {
    workspacesApi.members.mockResolvedValue([member('u1', 'OWNER'), member('u2', 'OWNER')])
    renderApp([acme, beta])

    await waitFor(() => expect(workspacesApi.members).toHaveBeenCalled())
    expect(screen.queryByText(/Eres el único project manager/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salir del workspace' })).toBeEnabled()
  })
})

describe('Ajustes para un miembro', () => {
  it('el campo de la URL se ve desactivado (atenuado), como el del nombre', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspaceForm defaultValues={{ name: 'Acme', slug: 'acme' }} onSubmit={vi.fn()} pending={false} submitLabel="Guardar" disabled />
      </QueryClientProvider>,
    )
    const url = screen.getByDisplayValue('acme')
    expect(url).toBeDisabled()
    expect(url.parentElement).toHaveClass('opacity-50')
  })
})
