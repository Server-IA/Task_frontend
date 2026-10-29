import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditableText } from './EditableText'

describe('EditableText', () => {
  it('Escape descarta lo escrito sin guardar', () => {
    const onSave = vi.fn()
    render(<EditableText value="Original" onSave={onSave} singleLine />)
    const box = screen.getByRole('textbox')
    box.focus()
    fireEvent.change(box, { target: { value: 'Editado' } })
    fireEvent.keyDown(box, { key: 'Escape' })

    expect(onSave).not.toHaveBeenCalled()
    expect(box).toHaveValue('Original')
    expect(box).not.toHaveFocus()
  })

  it('con cambios, Escape no llega al panel o diálogo de alrededor (Radix escucha en document)', () => {
    const closePanel = vi.fn()
    document.addEventListener('keydown', closePanel, true)
    render(<EditableText value="Original" onSave={() => {}} singleLine />)
    const box = screen.getByRole('textbox')
    box.focus()
    fireEvent.change(box, { target: { value: 'Editado' } })
    fireEvent.keyDown(box, { key: 'Escape' })
    document.removeEventListener('keydown', closePanel, true)

    expect(closePanel).not.toHaveBeenCalled()
  })

  it('después de descartar, la siguiente edición sí se guarda al salir', () => {
    const onSave = vi.fn()
    render(<EditableText value="Original" onSave={onSave} singleLine />)
    const box = screen.getByRole('textbox')
    box.focus()
    fireEvent.change(box, { target: { value: 'Editado' } })
    fireEvent.keyDown(box, { key: 'Escape' })

    box.focus()
    fireEvent.change(box, { target: { value: 'Otro título' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith('Otro título')
  })
})
