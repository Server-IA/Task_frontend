import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { knownFilterIds } from '@/features/issues/unknownFilters'
import { ApiError } from '@/lib/errors'
import { SavedViewsBar } from './SavedViewsBar'

const create = vi.fn()
const update = vi.fn()
let views = []
let manager = false
let activeState = { active: null, missing: [] }

vi.mock('../hooks', () => ({
  useActiveSavedView: () => ({ views, current: { view: 'list' }, changed: [], ...activeState }),
  useCreateSavedView: () => ({ mutate: create, isPending: false }),
  useUpdateSavedView: () => ({ mutate: update, isPending: false }),
  useDeleteSavedView: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderSavedViews: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/features/issues/hooks', () => ({ useIssues: () => ({ data: { totalElements: 0 } }) }))
vi.mock('@/features/workspaces/hooks', () => ({ useCan: () => manager }))

const view = (id, name, extra) => ({ id, name, shared: false, mine: true, filters: {}, position: 0, ...extra })
const meta = { states: [], labels: [], users: [], cycles: [], modules: [] }
const issueFilters = { activeViewId: null, applyParams: vi.fn() }

function renderBar(known) {
  return render(<SavedViewsBar slug="acme" project={{ id: 'p1', issueCount: 3 }} meta={meta} issueFilters={issueFilters} known={known} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  manager = false
  activeState = { active: null, missing: [] }
  views = [view('v1', 'Mis bugs'), view('v2', 'Sprint', { shared: true, mine: false })]
})

async function openSave(user) {
  await user.click(screen.getByRole('button', { name: 'Guardar vista' }))
  return screen.getByPlaceholderText('Para la daily')
}

describe('Vistas guardadas: nombre repetido', () => {
  it('al guardar, un nombre de otra vista personal mía se marca en el campo y no se manda', async () => {
    const user = userEvent.setup()
    renderBar()
    const input = await openSave(user)
    await user.type(input, '  mis   BUGS {Enter}')

    expect(create).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Ya tienes una vista personal llamada «mis BUGS» en este proyecto')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Ya tienes una vista personal llamada «mis BUGS» en este proyecto')

    // Al escribir de nuevo, el aviso se va
    await user.type(input, 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el nombre de una compartida sí sirve para una personal', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.type(await openSave(user), 'Sprint{Enter}')
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Sprint', shared: false }), expect.anything())
  })

  it('el 409 del backend también se muestra en el campo (no como toast)', async () => {
    const user = userEvent.setup()
    create.mockImplementation((_body, { onError }) =>
      onError(new ApiError({ status: 409, code: 'NAME_TAKEN', message: 'Ya hay una vista compartida llamada «Daily» en este proyecto' })),
    )
    manager = true
    renderBar()
    const input = await openSave(user)
    await user.click(screen.getByRole('radio', { name: /Compartida/ }))
    await user.type(input, 'Daily{Enter}')

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Daily', shared: true }), expect.anything())
    expect(screen.getByRole('alert')).toHaveTextContent('Ya hay una vista compartida llamada «Daily» en este proyecto')
  })

  it('al cambiar el nombre, uno de otra vista del grupo se marca en el campo', async () => {
    const user = userEvent.setup()
    views = [...views, view('v3', 'Pendientes')]
    renderBar()
    await user.click(screen.getByRole('button', { name: 'Acciones de la vista «Pendientes»' }))
    await user.click(await screen.findByRole('menuitem', { name: /Cambiar nombre/ }))
    const input = await screen.findByRole('textbox', { name: 'Nombre' })
    await user.clear(input)
    await user.type(input, 'mis bugs{Enter}')

    expect(update).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tienes una vista personal llamada «mis bugs» en este proyecto')
  })
})

describe('Vistas guardadas con una etiqueta que ya no existe', () => {
  it('al aplicarla, la etiqueta borrada no llega a la URL (las que existen sí)', async () => {
    const user = userEvent.setup()
    views = [view('v1', 'Diseño', { filters: { label: ['borrada', 'l1'], priority: ['HIGH'], view: 'list' } })]
    renderBar(knownFilterIds({ labels: [{ id: 'l1' }] }))
    await user.click(screen.getByRole('button', { name: /^personal\s?Diseño/ }))

    const build = issueFilters.applyParams.mock.calls[0][0]
    const next = build(new URLSearchParams('label=vieja'))
    expect(next.getAll('label')).toEqual(['l1'])
    expect(next.getAll('priority')).toEqual(['HIGH'])
    expect(next.get('savedView')).toBe('v1')
  })

  it('si la vista solo tenía etiquetas borradas, lo dice al lado, sin error', () => {
    views = [view('v1', 'Diseño', { filters: { label: ['borrada'] } })]
    activeState = { active: views[0], missing: ['label'] }
    renderBar(knownFilterIds({ labels: [] }))
    expect(screen.getByText('Esta vista filtraba por una etiqueta que ya no existe')).toBeInTheDocument()
  })
})
