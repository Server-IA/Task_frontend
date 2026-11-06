import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { IssuePage } from './IssuePage'

vi.mock('@/features/workspaces/hooks', () => ({ useCurrentWorkspace: () => ({ slug: 'acme', name: 'Acme' }) }))
vi.mock('@/features/projects/hooks', () => ({ useCurrentProject: () => ({ id: 'p1', name: 'Web', identifier: 'WEB' }) }))
vi.mock('../hooks', () => ({
  useIssue: (_slug, _projectId, issueId) => ({ data: { id: issueId, code: issueId, type: issueId.startsWith('S') ? 'STORY' : 'TASK' } }),
}))
// La ruta (migas) como texto: «etiqueta → destino»
vi.mock('@/layouts/PageHeader', () => ({
  PageHeader: ({ path }) => <nav aria-label="Ruta">{path.map((crumb) => `${crumb.label} → ${crumb.to ?? ''}`).join(' / ')}</nav>,
}))
vi.mock('@/lib/paths', () => ({ projectPath: () => [] }))
// El detalle con un borrador propio (como el comentario sin enviar)
vi.mock('../components/IssueDetailWithExtras', () => ({
  IssueDetailWithExtras: function Detail({ issueId, onOpenIssue }) {
    const [draft, setDraft] = useState('')
    return (
      <div>
        <p>tarea {issueId}</p>
        <input aria-label="Comentario" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="button" onClick={() => onOpenIssue('B')}>
          subtarea
        </button>
      </div>
    )
  },
}))

describe('IssuePage', () => {
  it('al pasar a otra tarea no se arrastran los borradores de la anterior', () => {
    const router = createMemoryRouter([{ path: '/:slug/projects/:projectId/issues/:issueId', element: <IssuePage /> }], {
      initialEntries: ['/acme/projects/p1/issues/A'],
    })
    render(<RouterProvider router={router} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Comentario' }), { target: { value: 'Para A' } })

    act(() => fireEvent.click(screen.getByRole('button', { name: 'subtarea' })))
    expect(screen.getByText('tarea B')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Comentario' })).toHaveValue('')
  })

  it('la ruta de una historia lleva a Historias (en Tareas no aparece); la de una tarea, a Tareas', () => {
    const router = createMemoryRouter([{ path: '/:slug/projects/:projectId/issues/:issueId', element: <IssuePage /> }], {
      initialEntries: ['/acme/projects/p1/issues/S4'],
    })
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('navigation', { name: 'Ruta' })).toHaveTextContent('historias → /acme/projects/p1/stories')

    act(() => fireEvent.click(screen.getByRole('button', { name: 'subtarea' })))
    expect(screen.getByRole('navigation', { name: 'Ruta' })).toHaveTextContent('tareas → /acme/projects/p1/issues')
  })
})
