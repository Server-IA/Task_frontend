import { act, render, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { ApiError } from '@/lib/errors'
import { IssueBoardView } from './IssueBoardView'

// El arrastre se simula llamando a los manejadores del DndContext (jsdom no mide nada: no hay geometría para el puntero)
const dnd = vi.hoisted(() => ({ props: null }))
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    DndContext: (props) => {
      dnd.props = props
      return <actual.DndContext {...props} />
    },
  }
})

const todo = { id: 's-todo', name: 'Por hacer', group: 'UNSTARTED', color: '#888', position: 0 }
const doing = { id: 's-doing', name: 'En curso', group: 'STARTED', color: '#00f', position: 1 }
const meta = { states: [todo, doing], labels: [], users: [], cycles: [], modules: [] }

const login = { id: 'st1', code: 'WEB-1', title: 'Login', type: 'STORY' }
const pago = { id: 'st2', code: 'WEB-2', title: 'Pago', type: 'STORY' }
const storyRow = (story, extra) => ({ story: { ...story, state: doing, storyTaskCount: 1, ...extra }, people: [] })
const issue = (id, extra) => ({ id, code: id.toUpperCase(), title: `Tarea ${id}`, type: 'TASK', state: todo, sortOrder: 1, labels: [], assignees: [], ...extra })

let issues = []
const mutate = vi.fn()
vi.mock('../hooks', () => ({
  useIssues: () => ({ data: { content: issues, totalElements: issues.length }, isLoading: false }),
  useMoveIssue: () => ({ mutate }),
}))
vi.mock('../useIssueHelpers', () => ({ useIssueUpdater: () => ({ update: vi.fn() }), isClosed: () => false }))
vi.mock('@/features/stories/hooks', () => ({
  useStories: () => ({ data: [storyRow(login), storyRow(pago)] }),
  isStoryClosedError: (error) => error?.code === 'STORY_CLOSED',
}))
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspace: () => ({ data: { myRole: 'OWNER' } }) }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  issues = [
    issue('web-3', { parent: login }),
    issue('web-4', { parent: pago, sortOrder: 1 }),
    issue('web-5', { type: 'BUG', parent: pago, sortOrder: 2 }),
    issue('web-6'),
  ]
})

const common = { slug: 'acme', project: { id: 'p1', identifier: 'WEB' }, meta, filters: {}, onCreateInState: () => {}, openIssue: () => {} }

/** Arrastra `id` hasta la columna `column` (`carril|estado`) y la suelta ahí. */
function drag(id, column) {
  const active = { id }
  const over = { id: `column:${column}` }
  act(() => dnd.props.onDragStart({ active }))
  act(() => dnd.props.onDragOver({ active, over }))
  act(() => dnd.props.onDragEnd({ active, over }))
}

describe('Tablero por historia: soltar en otro carril', () => {
  it('en el carril de otra historia, la tarea pasa a esa historia (con el estado de la columna) y avisa', () => {
    render(<IssueBoardView {...common} groupBy="story" />)

    drag('web-3', `${pago.id}|${doing.id}`)

    expect(mutate).toHaveBeenCalledTimes(1)
    const variables = mutate.mock.calls[0][0]
    expect(variables).toMatchObject({
      issueId: 'web-3',
      stateId: doing.id,
      parentChange: { parentId: pago.id },
      parent: pago,
      // Al final de la columna de ese carril: después de la tarea de Pago que ya está en «En curso» (ninguna)
      afterIssueId: null,
      beforeIssueId: null,
    })
    variables.onMoved()
    expect(toast.success).toHaveBeenCalledWith('WEB-3 ahora es de WEB-2', { description: 'Cuenta en el avance de «Pago».' })
  })

  it('un bug queda como bug de la historia nueva', () => {
    render(<IssueBoardView {...common} groupBy="story" />)

    drag('web-5', `${login.id}|${todo.id}`)

    const variables = mutate.mock.calls[0][0]
    expect(variables).toMatchObject({ issueId: 'web-5', stateId: todo.id, parentChange: { parentId: login.id }, afterIssueId: 'web-3' })
    variables.onMoved()
    expect(toast.success).toHaveBeenCalledWith('WEB-5 ahora es de WEB-1', { description: 'Queda como bug de «Login».' })
  })

  it('en «Sin historia» le quita la historia', () => {
    render(<IssueBoardView {...common} groupBy="story" />)

    drag('web-4', `none|${todo.id}`)

    const variables = mutate.mock.calls[0][0]
    expect(variables).toMatchObject({ issueId: 'web-4', stateId: todo.id, parentChange: { clearParent: true }, parent: null })
    variables.onMoved()
    expect(toast.success).toHaveBeenCalledWith('WEB-4 quedó sin historia', { description: 'Tarea web-4' })
  })

  it('«Sin historia» se ve aunque esté vacío: es donde se suelta para sacarla de su historia', () => {
    issues = [issue('web-3', { parent: login })]
    render(<IssueBoardView {...common} groupBy="story" />)
    expect(screen.getByRole('region', { name: 'Sin historia' })).toBeInTheDocument()
  })

  it('dentro de su carril solo cambia el estado', () => {
    render(<IssueBoardView {...common} groupBy="story" />)

    drag('web-4', `${pago.id}|${doing.id}`)

    const variables = mutate.mock.calls[0][0]
    expect(variables).toMatchObject({ issueId: 'web-4', stateId: doing.id })
    expect(variables).not.toHaveProperty('parentChange')
    expect(variables.onMoved).toBeUndefined()
  })

  it('si la historia nueva está cerrada, pregunta si reabrirla y reintenta con reopenParent', async () => {
    render(<IssueBoardView {...common} groupBy="story" />)

    drag('web-3', `${pago.id}|${todo.id}`)
    act(() => mutate.mock.calls[0][0].onError(new ApiError({ status: 409, code: 'STORY_CLOSED', message: 'WEB-2 está cerrada. Reábrela o crea la tarea suelta relacionada' })))

    expect(await screen.findByText('Agregar WEB-3 a la historia la vuelve a abrir.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /WEB-2 está cerrada/ })).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: /Reabrir la historia y continuar/ }).click())
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(mutate.mock.calls[1][0]).toMatchObject({ issueId: 'web-3', parentChange: { parentId: pago.id }, reopenParent: true })
  })

  it('los anuncios del lector de pantalla van en español, con el código, el título, la columna y la historia', () => {
    render(<IssueBoardView {...common} groupBy="story" />)
    const { announcements, screenReaderInstructions } = dnd.props.accessibility
    expect(screenReaderInstructions.draggable).toMatch(/pulsa Espacio/)
    expect(announcements.onDragStart({ active: { id: 'web-4' } })).toBe('Levantaste WEB-4 «Tarea web-4».')
    expect(announcements.onDragOver({ active: { id: 'web-4' }, over: { id: `column:${login.id}|${doing.id}` } })).toBe(
      'WEB-4 «Tarea web-4» está en la columna «En curso» de la historia WEB-1.',
    )
    expect(announcements.onDragEnd({ active: { id: 'web-4' }, over: { id: 'web-5' } })).toBe(
      'Soltaste WEB-4 «Tarea web-4» en la columna «Por hacer» de la historia WEB-2, posición 2 de 2.',
    )
    expect(announcements.onDragCancel({ active: { id: 'web-4' } })).toBe('Cancelaste el arrastre. WEB-4 «Tarea web-4» volvió a su lugar.')
  })
})
