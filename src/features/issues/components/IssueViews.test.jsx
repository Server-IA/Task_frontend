import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { BugsView } from './BugsView'
import { IssueBoardView } from './IssueBoardView'
import { IssueListView } from './IssueListView'

const todo = { id: 's-todo', name: 'Por hacer', group: 'UNSTARTED', color: '#888', position: 0 }
const doing = { id: 's-doing', name: 'En curso', group: 'STARTED', color: '#00f', position: 1 }
const done = { id: 's-done', name: 'Hecho', group: 'COMPLETED', color: '#0a0', position: 2 }
const cancelled = { id: 's-cancel', name: 'Cancelada', group: 'CANCELLED', color: '#999', position: 3 }
const meta = { states: [todo, doing, done, cancelled], labels: [], users: [], cycles: [], modules: [] }

const issue = (id, extra) => ({ id, code: id.toUpperCase(), title: `Tarea ${id}`, type: 'TASK', state: todo, sortOrder: 1, labels: [], assignees: [], ...extra })
let issues = []
let role = 'MEMBER'
const update = vi.fn()

vi.mock('../hooks', () => ({
  useIssues: () => ({ data: { content: issues, totalElements: issues.length, page: 0, size: 50, totalPages: 1, first: true, last: true }, isLoading: false }),
  useMoveIssue: () => ({ mutate: vi.fn() }),
}))
vi.mock('../useIssueHelpers', () => ({
  useIssueUpdater: () => ({ update }),
  isClosed: (item) => item?.state?.group === 'COMPLETED' || item?.state?.group === 'CANCELLED',
}))
vi.mock('@/features/stories/hooks', () => ({ useStories: () => ({ data: [] }), isStoryClosedError: () => false }))
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspace: () => ({ data: { myRole: role } }) }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

beforeEach(() => {
  vi.clearAllMocks()
  role = 'MEMBER'
})

const project = { id: 'p1', identifier: 'WEB', name: 'Web' }
const common = { slug: 'acme', project, meta, filters: {}, onCreateInState: () => {} }

describe('Tablero', () => {
  it('Enter en una tarjeta la abre (Espacio es el que la levanta para arrastrar)', () => {
    issues = [issue('web-1')]
    const openIssue = vi.fn()
    render(<IssueBoardView {...common} openIssue={openIssue} />)
    const card = screen.getByText('Tarea web-1').closest('[aria-roledescription="sortable"]')
    card.focus()
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
    expect(openIssue).toHaveBeenCalledWith('web-1')
  })

  it('soltar con Enter una tarjeta levantada con el teclado no la abre', async () => {
    issues = [issue('web-1')]
    const openIssue = vi.fn()
    render(<IssueBoardView {...common} openIssue={openIssue} />)
    const card = screen.getByText('Tarea web-1').closest('[aria-roledescription="sortable"]')
    card.focus()
    fireEvent.keyDown(card, { key: ' ', code: 'Space' })
    await screen.findByText(/Picked up draggable item web-1/)
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
    await screen.findByText(/was dropped/)
    expect(openIssue).not.toHaveBeenCalled()
  })

  it('las historias no se arrastran; las tareas sí', () => {
    issues = [issue('web-1'), issue('web-2', { type: 'STORY', title: 'Historia web-2' })]
    render(<IssueBoardView {...common} openIssue={() => {}} />)
    const card = (title) => screen.getByText(title).closest('[aria-roledescription="sortable"]')
    expect(card('Historia web-2')).toHaveAttribute('aria-disabled', 'true')
    expect(card('Tarea web-1')).toHaveAttribute('aria-disabled', 'false')
  })
})

describe('Lista: estados de una historia', () => {
  async function openStatePicker() {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <IssueListView {...common} sort="sortOrder,asc" page={0} setPage={() => {}} openIssue={() => {}} onCreate={() => {}} />
      </MemoryRouter>,
    )
    await user.click(within(screen.getByRole('list')).getAllByRole('button', { name: 'Estado' })[0])
    return screen.getAllByRole('option').map((option) => option.textContent)
  }

  it('a un miembro no le ofrece completar ni cancelar una historia', async () => {
    issues = [issue('web-2', { type: 'STORY' })]
    expect(await openStatePicker()).toEqual(['Por hacer', 'En curso'])
  })

  it('al project manager, sí', async () => {
    role = 'OWNER'
    issues = [issue('web-2', { type: 'STORY' })]
    expect(await openStatePicker()).toEqual(['Por hacer', 'En curso', 'Hecho', 'Cancelada'])
  })

  it('una historia cerrada no la mueve un miembro', () => {
    issues = [issue('web-2', { type: 'STORY', state: done })]
    render(
      <MemoryRouter>
        <IssueListView {...common} sort="sortOrder,asc" page={0} setPage={() => {}} openIssue={() => {}} onCreate={() => {}} />
      </MemoryRouter>,
    )
    expect(within(screen.getByRole('list')).getAllByRole('button', { name: 'Estado' })[0]).toBeDisabled()
  })
})

describe('Bugs', () => {
  it('completar un bug con criterios sin marcar pide confirmación, como en la lista y el tablero', async () => {
    const user = userEvent.setup()
    issues = [issue('web-3', { type: 'BUG', priority: 'HIGH', assignees: [{ id: 'u1', fullName: 'Ana' }], criteriaTotal: 2, criteriaDone: 0 })]
    render(
      <MemoryRouter>
        <BugsView {...common} openIssue={() => {}} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Estado' }))
    await user.click(screen.getByRole('option', { name: /Hecho/ }))

    expect(screen.getByRole('alertdialog')).toHaveTextContent('¿Mover WEB-3 a Hecho?')
    expect(update).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Mover igual' }))
    expect(update).toHaveBeenCalledWith({ stateId: 's-done' }, expect.objectContaining({ onError: expect.any(Function) }))
  })
})
