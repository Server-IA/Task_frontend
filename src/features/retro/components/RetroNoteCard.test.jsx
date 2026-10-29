import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { retroApi } from '../api'
import { RetroNoteCard } from './RetroNoteCard'

vi.mock('../api', () => ({
  retroApi: { updateNote: vi.fn(), convert: vi.fn(), removeNote: vi.fn(), vote: vi.fn(), unvote: vi.fn() },
}))

// jsdom no trae lo que usan el popover (Radix) y la lista con búsqueda (cmdk)
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
})

const ana = { id: 'ana', fullName: 'Ana', email: 'ana@test.com' }
const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez', email: 'luis@test.com' }
const retro = { started: true, finishedAt: null, myVotesLeft: 3, notes: [] }

function renderCard(note, ctxOverrides = {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const ctx = {
    slug: 'equipo',
    projectId: 'p1',
    cycleId: 'c1',
    userId: 'ana',
    manager: true,
    members: [ana, luis],
    canEdit: () => true,
    openIssue: vi.fn(),
    ...ctxOverrides,
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <RetroNoteCard note={note} retro={retro} ctx={ctx} />
    </QueryClientProvider>,
  )
}

const action = (extra = {}) => ({
  id: 'n1',
  column: 'ACTION',
  text: 'Dividir WEB-2 en tareas más pequeñas.',
  author: ana,
  owner: null,
  votes: 0,
  votedByMe: false,
  createdAt: '2026-10-28T10:00:00Z',
  issue: null,
  ...extra,
})

describe('RetroNoteCard: responsable de una acción', () => {
  afterEach(() => vi.clearAllMocks())

  it('muestra al responsable en lugar del autor', () => {
    renderCard(action({ owner: luis }))
    // Nombre y primer apellido, como en el diseño; el completo va en el botón para cambiarlo
    expect(screen.getByText('responsable: Luis Muñoz')).toBeInTheDocument()
    expect(screen.queryByText('Tú')).not.toBeInTheDocument()
  })

  it('sin responsable, quien puede editar lo elige y solo viaja ownerId', async () => {
    retroApi.updateNote.mockResolvedValue(action({ owner: luis }))
    renderCard(action())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Elegir responsable' }))
    await user.click(await screen.findByRole('option', { name: /Luis Muñoz Pérez/ }))
    expect(retroApi.updateNote).toHaveBeenCalledWith('equipo', 'p1', 'c1', 'n1', { ownerId: 'luis' })
  })

  it('quitar el responsable manda clearOwner', async () => {
    retroApi.updateNote.mockResolvedValue(action())
    renderCard(action({ owner: luis }))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Responsable: Luis Muñoz Pérez/ }))
    await user.click(await screen.findByRole('option', { name: /Sin responsable/ }))
    expect(retroApi.updateNote).toHaveBeenCalledWith('equipo', 'p1', 'c1', 'n1', { clearOwner: true })
  })

  it('sin permiso para editar no se puede cambiar', () => {
    renderCard(action({ owner: luis }), { canEdit: () => false, manager: false })
    expect(screen.queryByRole('button', { name: /Responsable:/ })).not.toBeInTheDocument()
    // Nombre y primer apellido, como en el diseño; el completo va en el botón para cambiarlo
    expect(screen.getByText('responsable: Luis Muñoz')).toBeInTheDocument()
  })

  it('el project manager crea la tarea desde la acción', async () => {
    retroApi.convert.mockResolvedValue({ id: 'i1', code: 'WEB-27', title: 'Dividir', assignees: [luis] })
    renderCard(action({ owner: luis }))
    const button = screen.getByRole('button', { name: 'Crear tarea' })
    expect(button).toHaveAttribute('title', 'Crea la tarea asignada a Luis Muñoz Pérez')
    await userEvent.setup().click(button)
    expect(retroApi.convert).toHaveBeenCalledWith('equipo', 'p1', 'c1', 'n1')
  })

  it('al editar, cambiar solo el texto no toca al responsable', async () => {
    retroApi.updateNote.mockResolvedValue(action({ owner: luis, text: 'Dividir WEB-2' }))
    renderCard(action({ owner: luis }))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Acciones de la nota' }))
    await user.click(await screen.findByRole('menuitem', { name: /Editar/ }))
    const field = screen.getByRole('textbox', { name: 'Editar nota' })
    await user.clear(field)
    await user.type(field, 'Dividir WEB-2')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(retroApi.updateNote).toHaveBeenCalledWith('equipo', 'p1', 'c1', 'n1', { text: 'Dividir WEB-2' })
  })

  it('las notas que no son acciones no tienen responsable', () => {
    renderCard({ ...action(), column: 'IMPROVE' })
    const card = screen.getByRole('article')
    expect(within(card).queryByRole('button', { name: 'Elegir responsable' })).not.toBeInTheDocument()
    expect(within(card).getByText('Tú')).toBeInTheDocument()
  })
})
