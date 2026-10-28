import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { retroApi } from '../api'
import { RETRO_COLUMNS } from '../retroNotes'
import { RetroColumn } from './RetroColumn'

vi.mock('../api', () => ({ retroApi: { createNote: vi.fn() } }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
})

const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez', email: 'luis@test.com' }

function renderColumn(key) {
  const column = RETRO_COLUMNS.find((item) => item.key === key)
  const ctx = { slug: 'equipo', projectId: 'p1', cycleId: 'c1', userId: 'ana', manager: false, members: [luis], canEdit: () => true, openIssue: vi.fn() }
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <RetroColumn column={column} notes={[]} retro={{ started: true, notes: [] }} open composing onCompose={() => {}} ctx={ctx} />
    </QueryClientProvider>,
  )
}

describe('RetroColumn: nueva nota', () => {
  it('una acción nueva lleva el responsable elegido', async () => {
    retroApi.createNote.mockResolvedValue({ id: 'n1', column: 'ACTION', text: 'Planificar', owner: luis })
    renderColumn('ACTION')
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Nueva nota en Acciones' }), 'Planificar el Sprint 2')
    await user.click(screen.getByRole('button', { name: 'Elegir responsable' }))
    await user.click(await screen.findByRole('option', { name: /Luis Muñoz Pérez/ }))
    expect(screen.getByRole('button', { name: /Responsable: Luis Muñoz Pérez/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(retroApi.createNote).toHaveBeenCalledWith('equipo', 'p1', 'c1', {
      column: 'ACTION',
      text: 'Planificar el Sprint 2',
      ownerId: 'luis',
    })
  })

  it('en las otras columnas no se pide responsable', () => {
    renderColumn('IMPROVE')
    expect(screen.queryByRole('button', { name: 'Elegir responsable' })).not.toBeInTheDocument()
  })
})
