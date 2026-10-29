import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SplitComposer } from './SplitComposer'

vi.mock('../hooks', () => ({ useSplitStory: () => ({ mutate: vi.fn(), isPending: false }) }))

const story = { id: 's1', code: 'WEB-15', priority: 'NONE', labels: [], modules: [] }
const members = [{ id: 'u-ana', fullName: 'Ana Gómez', email: 'ana@test.com' }]

/** Radix (el panel o el diálogo de alrededor) escucha Escape en `document`, en captura. */
const panelEscape = vi.fn()
afterEach(() => {
  document.removeEventListener('keydown', panelEscape, true)
  panelEscape.mockClear()
})

function renderComposer(onCancel = vi.fn()) {
  document.addEventListener('keydown', panelEscape, true)
  render(<SplitComposer slug="acme" project={{ id: 'p1' }} story={story} members={members} onDone={vi.fn()} onCancel={onCancel} />)
  return onCancel
}

describe('SplitComposer: Escape', () => {
  it('con el selector abierto, Escape lo cierra y no cierra el panel ni borra las líneas', () => {
    const onCancel = renderComposer()
    const line = screen.getByRole('textbox', { name: 'Tarea 1' })
    fireEvent.change(line, { target: { value: 'Revisar @an', selectionStart: 11 } })
    expect(screen.getByRole('listbox', { name: 'Asignar a' })).toBeInTheDocument()

    fireEvent.keyDown(line, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
    expect(panelEscape).not.toHaveBeenCalled()
    expect(line).toHaveValue('Revisar @an')
  })

  it('sin selector, Escape cancela el compositor (y tampoco llega al panel)', () => {
    const onCancel = renderComposer()
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Tarea 1' }), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(panelEscape).not.toHaveBeenCalled()
  })
})
