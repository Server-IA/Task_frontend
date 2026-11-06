import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { toast } from 'sonner'
import { retroApi } from '../api'
import { RETRO_COLUMNS } from '../retroNotes'
import { RetroColumn } from './RetroColumn'

vi.mock('../api', () => ({ retroApi: { createNote: vi.fn() } }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { warning: vi.fn(), success: vi.fn(), error: vi.fn() }) }))

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

function renderColumn(key, { onCompose = () => {} } = {}) {
  const column = RETRO_COLUMNS.find((item) => item.key === key)
  const ctx = { slug: 'equipo', projectId: 'p1', cycleId: 'c1', userId: 'ana', manager: false, open: true, members: [luis], canEdit: () => true, openIssue: vi.fn() }
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const ui = (open) => (
    <QueryClientProvider client={client}>
      <RetroColumn column={column} notes={[]} retro={{ started: true, notes: [] }} open={open} composing onCompose={onCompose} ctx={{ ...ctx, open }} />
    </QueryClientProvider>
  )
  const result = render(ui(true))
  return { ...result, close: () => result.rerender(ui(false)) }
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

describe('RetroColumn: la retro termina mientras se escribe', () => {
  it('cierra el campo y ofrece «Copiar mi texto» con la nota a medio escribir', async () => {
    const onCompose = vi.fn()
    const { close } = renderColumn('WENT_WELL', { onCompose })
    const user = userEvent.setup()
    // Después de setup: user-event pone su propio portapapeles
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.type(screen.getByRole('textbox', { name: 'Nueva nota en Qué salió bien' }), 'La demo salió perfecta')

    close()

    expect(toast.warning).toHaveBeenCalledTimes(1)
    const [title, options] = toast.warning.mock.calls[0]
    expect(title).toBe('La retrospectiva terminó; tu nota no se guardó')
    expect(options.duration).toBe(Infinity)
    expect(options.action.label).toBe('Copiar mi texto')
    options.action.onClick()
    expect(writeText).toHaveBeenCalledWith('La demo salió perfecta')
    expect(onCompose).toHaveBeenCalledWith(false)
  })

  it('sin texto escrito solo cierra el campo, sin aviso', () => {
    toast.warning.mockClear()
    const onCompose = vi.fn()
    const { close } = renderColumn('IMPROVE', { onCompose })
    close()
    expect(toast.warning).not.toHaveBeenCalled()
    expect(onCompose).toHaveBeenCalledWith(false)
  })
})
