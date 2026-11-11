import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TABLE_GRID, TablePicker, tableSize } from './TablePicker'

describe('tableSize', () => {
  it('acepta enteros y los deja entre 1 y el máximo', () => {
    expect(tableSize('4', 12)).toBe(4)
    expect(tableSize('0', 12)).toBe(1)
    expect(tableSize('99', 12)).toBe(12)
    expect(tableSize('', 12)).toBeNull()
    expect(tableSize('3x', 12)).toBeNull()
  })
})

describe('TablePicker', () => {
  const cell = (container, col, row) => container.querySelectorAll('button[tabindex="-1"]')[(row - 1) * TABLE_GRID.cols + (col - 1)]

  it('pasar por la cuadrícula llena los campos y el clic inserta ese tamaño', async () => {
    const onInsert = vi.fn()
    const { container } = render(<TablePicker style={{}} onInsert={onInsert} onClose={() => {}} />)
    await userEvent.hover(cell(container, 5, 4))
    expect(screen.getByLabelText('Columnas')).toHaveValue('5')
    expect(screen.getByLabelText('Filas')).toHaveValue('4')
    await userEvent.click(cell(container, 5, 4))
    expect(onInsert).toHaveBeenCalledWith({ cols: 5, rows: 4 })
  })

  it('con los campos se pide un tamaño mayor que la cuadrícula y Enter inserta', async () => {
    const onInsert = vi.fn()
    render(<TablePicker style={{}} onInsert={onInsert} onClose={() => {}} />)
    await userEvent.clear(screen.getByLabelText('Columnas'))
    await userEvent.type(screen.getByLabelText('Columnas'), '10')
    await userEvent.clear(screen.getByLabelText('Filas'))
    await userEvent.type(screen.getByLabelText('Filas'), '20{Enter}')
    expect(onInsert).toHaveBeenCalledWith({ cols: 10, rows: 20 })
  })

  it('sin un número no inserta, y Escape cierra', async () => {
    const onInsert = vi.fn()
    const onClose = vi.fn()
    render(<TablePicker style={{}} onInsert={onInsert} onClose={onClose} />)
    await userEvent.clear(screen.getByLabelText('Columnas'))
    expect(screen.getByRole('button', { name: /Insertar/ })).toBeDisabled()
    await userEvent.keyboard('{Enter}')
    expect(onInsert).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})
