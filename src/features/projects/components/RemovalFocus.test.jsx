import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LabelsSettings } from './LabelsSettings'
import { ProjectMembersSettings } from './ProjectMembersSettings'
import { StatesSettings } from './StatesSettings'

let members = []
let labels = []
let states = []
const removeMember = vi.fn()
const removeLabel = vi.fn()
const removeState = vi.fn()
const mutation = { mutate: vi.fn(), isPending: false }

vi.mock('../hooks', () => ({
  useProjectMembers: () => ({ data: members }),
  useRemoveProjectMember: () => ({ mutate: removeMember, isPending: false }),
  useAddProjectMember: () => mutation,
  useLabels: () => ({ data: labels }),
  useCreateLabel: () => mutation,
  useUpdateLabel: () => mutation,
  useDeleteLabel: () => ({ mutate: removeLabel, isPending: false }),
  useStates: () => ({ data: states }),
  useCreateState: () => mutation,
  useUpdateState: () => mutation,
  useDeleteState: () => ({ mutate: removeState, isPending: false }),
  useReorderStates: () => mutation,
}))
vi.mock('@/features/workspaces/hooks', () => ({ useCan: () => true, useMembers: () => ({ data: [] }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const project = { id: 'p1', identifier: 'WEB' }
const user = (id, fullName) => ({ user: { id, fullName, email: `${id}@test.com` }, joinedAt: '2026-01-01T00:00:00Z' })

beforeEach(() => {
  vi.clearAllMocks()
  members = [user('ana', 'Ana Pérez'), user('luis', 'Luis Muñoz')]
  labels = [
    { id: 'l1', name: 'frontend', color: '#3B82F6' },
    { id: 'l2', name: 'backend', color: '#22C55E' },
  ]
  states = [
    { id: 's1', name: 'Todo', group: 'UNSTARTED', color: '#3A3A3A' },
    { id: 's2', name: 'Done', group: 'COMPLETED', color: '#16A34A' },
  ]
})

describe('Quitar una fila desde la confirmación: el foco no cae al body', () => {
  it('miembros del proyecto: tras «Quitar», el foco va a «Agregar» aunque la lista se recargue después', async () => {
    const actor = userEvent.setup()
    removeMember.mockImplementation((_id, { onSuccess }) => onSuccess())
    const { rerender } = render(<ProjectMembersSettings slug="acme" project={project} />)

    await actor.click(screen.getByRole('button', { name: 'Quitar a Luis Muñoz' }))
    await actor.click(await screen.findByRole('button', { name: 'Quitar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Agregar' })).toHaveFocus()

    // La lista llega sin la fila: el foco sigue en «Agregar»
    members = [user('ana', 'Ana Pérez')]
    rerender(<ProjectMembersSettings slug="acme" project={project} />)
    expect(screen.getByRole('button', { name: 'Agregar' })).toHaveFocus()
  })

  it('etiquetas: tras eliminar, el foco va a «Nueva etiqueta»', async () => {
    const actor = userEvent.setup()
    removeLabel.mockImplementation((_id, { onSuccess }) => onSuccess())
    render(<LabelsSettings slug="acme" project={project} />)

    await actor.click(screen.getByRole('button', { name: 'Eliminar la etiqueta «backend»' }))
    await actor.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Nueva etiqueta' })).toHaveFocus()
  })

  it('estados: si no se pudo eliminar (tiene tareas), el foco vuelve al botón de la fila', async () => {
    const actor = userEvent.setup()
    removeState.mockImplementation((_id, { onError }) => onError(new Error('Tiene tareas')))
    render(<StatesSettings slug="acme" project={project} />)

    const trash = screen.getByRole('button', { name: 'Eliminar el estado «Completado»' })
    await actor.click(trash)
    await actor.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(trash).toHaveFocus()
  })

  it('estados: si se eliminó, el foco va a «Nuevo estado»', async () => {
    const actor = userEvent.setup()
    removeState.mockImplementation((_id, { onSuccess }) => onSuccess())
    render(<StatesSettings slug="acme" project={project} />)

    await actor.click(screen.getByRole('button', { name: 'Eliminar el estado «Completado»' }))
    await actor.click(await screen.findByRole('button', { name: 'Eliminar' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Nuevo estado' })).toHaveFocus()
  })
})
