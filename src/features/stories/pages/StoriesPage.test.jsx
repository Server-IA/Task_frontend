import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/errors'
import { StoriesPage } from './StoriesPage'

let storiesResult = {}

vi.mock('../hooks', () => ({ useStories: () => storiesResult }))
vi.mock('@/features/workspaces/hooks', () => ({
  useCurrentWorkspace: () => ({ slug: 'acme', name: 'Acme' }),
  useCan: () => false,
}))
vi.mock('@/features/projects/hooks', () => ({ useCurrentProject: () => ({ id: 'p1', name: 'Web', identifier: 'WEB' }) }))
vi.mock('@/features/planning/hooks', () => ({ usePlanningList: () => ({ data: [] }) }))
vi.mock('@/features/issues/useIssueHelpers', () => ({ useProjectMeta: () => ({ states: [], labels: [], users: [] }) }))
vi.mock('@/features/issues/components/IssuePeekSheet', () => ({ IssuePeekSheet: () => null }))
vi.mock('@/features/issues/components/CreateIssueDialog', () => ({ CreateIssueDialog: () => null }))

const story = (id, extra) => ({
  id,
  code: id.toUpperCase(),
  title: `Historia ${id}`,
  type: 'STORY',
  state: { id: 's1', name: 'Por hacer', group: 'UNSTARTED' },
  subIssueCount: 1,
  completedSubIssueCount: 0,
  ...extra,
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/acme/projects/p1/stories']}>
      <StoriesPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  storiesResult = {}
})

describe('Historias: pestañas', () => {
  it('con error al cargar, las pestañas no muestran «0» junto al error', () => {
    storiesResult = { data: undefined, isLoading: false, error: new ApiError({ status: 500, message: 'Falló' }), refetch: vi.fn() }
    renderPage()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Abiertas', 'Sin partir', 'Para revisar', 'Cerradas'])
  })

  it('con datos, cada pestaña lleva su cuenta', () => {
    storiesResult = { data: [{ story: story('web-1'), people: [], children: [], related: [] }], isLoading: false, error: null, refetch: vi.fn() }
    renderPage()
    expect(screen.getByRole('tab', { name: /Abiertas/ })).toHaveTextContent('Abiertas1')
  })
})

describe('Historias: filas', () => {
  it('el título es el botón de la fila (código y título); el botón de desplegar va aparte', async () => {
    storiesResult = { data: [{ story: story('web-1'), people: [], children: [], related: [] }], isLoading: false, error: null, refetch: vi.fn() }
    renderPage()
    const row = screen.getByRole('button', { name: 'WEB-1 Historia web-1' })
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row.closest('[role="button"]')).toBeNull()
    expect(within(row).queryByRole('button')).toBeNull()
    row.focus()
    await userEvent.setup().keyboard('{ArrowRight}')
    expect(row).toHaveAttribute('aria-expanded', 'true')
  })
})
