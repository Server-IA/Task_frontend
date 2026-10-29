import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CreateIssueDialog } from './CreateIssueDialog'

const bugTemplate = {
  id: 't-bug',
  name: 'Reporte de bug',
  titlePrefix: '[Bug] ',
  description: '## Pasos',
  priority: 'HIGH',
  labels: [],
  checklist: [],
}

const backlog = { id: 's-backlog', name: 'Backlog', group: 'BACKLOG', color: '#A3A3A3', position: 0 }
const todo = { id: 's-todo', name: 'Por hacer', group: 'UNSTARTED', color: '#3A3A3A', position: 1 }
const ana = { id: 'u-ana', fullName: 'Ana Gómez', email: 'ana@test.com' }
/** Plantilla que solo fija estado y asignados. */
const triageTemplate = {
  id: 't-triage',
  name: 'Triage',
  titlePrefix: null,
  description: null,
  priority: null,
  state: todo,
  assignees: [ana],
  labels: [],
  checklist: [],
}
const mutate = vi.fn()

vi.mock('@/features/templates/hooks', () => ({ useTemplates: () => ({ data: [bugTemplate, triageTemplate] }) }))
vi.mock('@/features/workspaces/hooks', () => ({ useIsManager: () => false }))
vi.mock('@/features/mentions/hooks', () => ({ useMentionPeople: () => [] }))
vi.mock('../useIssueHelpers', () => ({
  useProjectMeta: () => ({ states: [backlog, todo], users: [ana], labels: [], isLoading: false }),
}))
vi.mock('../hooks', () => ({ useCreateIssue: () => ({ mutate, isPending: false }) }))

// jsdom no trae ResizeObserver (lo usan el switch y los selectores de Radix)
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function renderDialog() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CreateIssueDialog
          slug="equipo"
          project={{ id: 'p1', identifier: 'WEB', name: 'Sitio web' }}
          open
          onOpenChange={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreateIssueDialog: plantillas', () => {
  it('al elegir una plantilla el cursor queda al final del título y lo escrito va después del prefijo', async () => {
    const user = userEvent.setup()
    renderDialog()
    const title = screen.getByRole('textbox', { name: 'Título' })

    await user.click(screen.getByRole('radio', { name: 'Reporte de bug' }))
    expect(title).toHaveValue('[Bug] ')
    expect(title).toHaveFocus()
    expect(title.selectionStart).toBe('[Bug] '.length)

    await user.keyboard('El login falla')
    expect(title).toHaveValue('[Bug] El login falla')
  })

  it('el cursor se coloca en cuanto se aplica la plantilla, sin esperar temporizadores', () => {
    renderDialog()
    const title = screen.getByRole('textbox', { name: 'Título' })
    fireEvent.change(title, { target: { value: 'Login' } })
    title.blur()
    // react-hook-form enfoca en un setTimeout: con los temporizadores detenidos, el cursor depende solo del diálogo
    vi.useFakeTimers({ toFake: ['setTimeout', 'requestAnimationFrame'] })
    try {
      fireEvent.click(screen.getByRole('radio', { name: 'Reporte de bug' }))
      expect(title).toHaveFocus()
      expect(title.selectionStart).toBe('[Bug] Login'.length)
    } finally {
      vi.useRealTimers()
    }
  })

  it('cambiar o quitar la plantilla conserva lo escrito y deja el cursor al final', async () => {
    const user = userEvent.setup()
    renderDialog()
    const title = screen.getByRole('textbox', { name: 'Título' })

    await user.keyboard('Login')
    await user.click(screen.getByRole('radio', { name: 'Reporte de bug' }))
    await user.keyboard(' en Safari')
    expect(title).toHaveValue('[Bug] Login en Safari')

    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(title).toHaveValue('Login en Safari')
    await user.keyboard('!')
    expect(title).toHaveValue('Login en Safari!')
  })
})

describe('CreateIssueDialog: estado y asignados de la plantilla', () => {
  it('la plantilla pone el estado y los asignados y «Deshacer» vuelve a los de antes', async () => {
    const user = userEvent.setup()
    renderDialog()
    const state = screen.getByRole('button', { name: 'Estado' })
    const assignees = screen.getByRole('button', { name: 'Asignados' })
    expect(state).toHaveTextContent('Backlog')
    expect(assignees).toHaveTextContent('Asignar')

    await user.click(screen.getByRole('radio', { name: 'Triage' }))
    expect(state).toHaveTextContent('Por hacer')
    expect(assignees).toHaveTextContent('Ana Gómez')
    expect(screen.getByText(/Se aplicó «Triage»: estado y asignado\./)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(state).toHaveTextContent('Backlog')
    expect(assignees).toHaveTextContent('Asignar')
  })

  it('al crear la tarea envía el estado y los asignados que puso la plantilla', async () => {
    const user = userEvent.setup()
    mutate.mockClear()
    renderDialog()

    await user.click(screen.getByRole('radio', { name: 'Triage' }))
    await user.keyboard('Revisar los logs')
    await user.click(screen.getByRole('button', { name: /Crear tarea/ }))

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Revisar los logs', stateId: 's-todo', assigneeIds: ['u-ana'], templateId: 't-triage' }),
      expect.anything(),
    )
  })
})

describe('CreateIssueDialog: ctrl ↵', () => {
  it('dos veces seguidas (o con la tecla repitiendo) crea una sola tarea', async () => {
    const user = userEvent.setup()
    mutate.mockClear()
    renderDialog()
    await user.type(screen.getByRole('textbox', { name: 'Título' }), 'Una sola')

    const title = screen.getByRole('textbox', { name: 'Título' })
    fireEvent.keyDown(title, { key: 'Enter', ctrlKey: true })
    fireEvent.keyDown(title, { key: 'Enter', ctrlKey: true, repeat: true })
    fireEvent.keyDown(title, { key: 'Enter', ctrlKey: true })
    // handleSubmit valida de forma asíncrona
    await vi.waitFor(() => expect(mutate).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})

