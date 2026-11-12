import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RequirePermission } from './RequirePermission'

let workspace
vi.mock('@/features/workspaces/hooks', () => ({ useCurrentWorkspace: () => workspace }))

function renderAt(url) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/:slug/projects/:projectId/stats"
          element={
            <RequirePermission permission="STATS_VIEW" title="Estadísticas">
              <p>las estadísticas</p>
            </RequirePermission>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequirePermission', () => {
  it('con el permiso muestra la página', () => {
    workspace = { slug: 'acme', myRole: 'MEMBER', myRoleName: 'Analista', myPermissions: ['STATS_VIEW'] }
    renderAt('/acme/projects/p1/stats')
    expect(screen.getByText('las estadísticas')).toBeInTheDocument()
  })

  it('sin el permiso explica que el rol no la incluye y ofrece volver a las tareas', () => {
    workspace = { slug: 'acme', myRole: 'MEMBER', myRoleName: 'Invitado', myPermissions: [] }
    renderAt('/acme/projects/p1/stats')
    expect(screen.queryByText('las estadísticas')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tu rol no incluye esta sección' })).toBeInTheDocument()
    expect(screen.getByText(/Tienes el rol «Invitado»/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a las tareas' })).toHaveAttribute('href', '/acme/projects/p1/issues')
  })

  it('el project manager siempre entra', () => {
    workspace = { slug: 'acme', myRole: 'OWNER' }
    renderAt('/acme/projects/p1/stats')
    expect(screen.getByText('las estadísticas')).toBeInTheDocument()
  })
})
