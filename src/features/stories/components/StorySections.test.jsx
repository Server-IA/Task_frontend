import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { StorySections } from './StoryPanel'

vi.mock('@/features/workspaces/hooks', () => ({ useWorkspace: () => ({ data: { myRole: 'OWNER' } }) }))
vi.mock('@/features/issues/useIssueHelpers', () => ({ useProjectMeta: () => ({ states: [], labels: [], users: [] }) }))
vi.mock('@/features/issues/hooks', () => ({
  useIssue: () => ({ data: null }),
  useSubIssues: () => ({
    data: [{ id: 't1', code: 'PORT-25', title: 'Endpoint paginado', type: 'TASK', state: { group: 'STARTED' }, assignees: [] }],
    isLoading: false,
  }),
}))
vi.mock('@/features/relations/hooks', () => ({ useRelations: () => ({ data: [] }) }))
vi.mock('../hooks', () => ({
  useSplitStory: () => ({ mutate: vi.fn(), isPending: false }),
  useCloseStory: () => ({}),
  useReopenStory: () => ({}),
}))
vi.mock('@/features/issues/components/CreateIssueDialog', () => ({ CreateIssueDialog: () => null }))

// Historia ya partida: sin ?split=1 el compositor no se abre solo
const story = { id: 's1', code: 'PORT-4', title: 'Historial de pedidos', type: 'STORY', priority: 'MEDIUM', subIssueCount: 1, labels: [], modules: [] }

function Search() {
  return <output aria-label="url">{useLocation().search}</output>
}

function renderSections(entry) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <StorySections slug="equipo" project={{ id: 'p1' }} issue={story} onOpenIssue={() => {}} onAdd={() => {}} onReportBug={() => {}} />
      <Search />
    </MemoryRouter>,
  )
}

describe('StorySections: «P» en Historias (?split=1)', () => {
  it('sin el pedido, una historia con tareas muestra el botón «Partir en tareas»', () => {
    renderSections('/stories?issue=s1')
    expect(screen.getByRole('button', { name: 'Partir en tareas' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Tarea 1' })).not.toBeInTheDocument()
  })

  it('con ?split=1 abre el compositor con el foco en la primera línea y quita el parámetro de la URL', async () => {
    renderSections('/stories?issue=s1&split=1')
    expect(await screen.findByRole('textbox', { name: 'Tarea 1' })).toHaveFocus()
    await waitFor(() => expect(screen.getByRole('status', { name: 'url' })).toHaveTextContent('?issue=s1'))
    expect(screen.getByRole('status', { name: 'url' })).not.toHaveTextContent('split')
  })

  it('al cancelar con Escape el foco vuelve a «Partir en tareas» (el compositor desaparece con el foco adentro)', async () => {
    const user = userEvent.setup()
    renderSections('/stories?issue=s1&split=1')
    await screen.findByRole('textbox', { name: 'Tarea 1' })
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('button', { name: 'Partir en tareas' })).toHaveFocus()
  })
})
