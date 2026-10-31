import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { dragHasFiles, draggedFileCount, useFileDrop } from './useFileDrop'

function Zone({ onFiles }) {
  const { dragging, count, overEditor, handlers } = useFileDrop({ onFiles })
  return (
    <div data-testid="zona" {...handlers}>
      <p data-testid="hijo">Descripción</p>
      <div contentEditable suppressContentEditableWarning data-testid="editor" onDrop={(event) => event.stopPropagation()}>
        texto
      </div>
      {dragging && <span>{overEditor ? 'sobre el editor' : `velo ${count ?? '?'}`}</span>}
    </div>
  )
}

const file = new File(['hola'], 'requisitos.pdf', { type: 'application/pdf' })
const withFiles = (files = [file]) => ({
  dataTransfer: { types: ['Files'], files, items: files.map(() => ({ kind: 'file' })), dropEffect: 'none' },
})
const withText = { dataTransfer: { types: ['text/plain'], files: [], items: [] } }

describe('useFileDrop', () => {
  it('reconoce cuándo se arrastran archivos y cuántos', () => {
    expect(dragHasFiles({ types: ['Files'] })).toBe(true)
    expect(dragHasFiles({ types: ['text/plain'] })).toBe(false)
    expect(dragHasFiles(null)).toBe(false)
    expect(draggedFileCount({ items: [{ kind: 'file' }, { kind: 'string' }, { kind: 'file' }] })).toBe(2)
    expect(draggedFileCount({})).toBeNull()
  })

  it('el velo sigue mientras el puntero cruza elementos hijos y se va al salir de la zona', () => {
    render(<Zone onFiles={vi.fn()} />)
    const zone = screen.getByTestId('zona')
    const child = screen.getByTestId('hijo')

    fireEvent.dragEnter(zone, withFiles())
    expect(screen.getByText('velo 1')).toBeInTheDocument()
    // Entra al hijo antes de salir de la zona: la cuenta sube a 2 y baja a 1
    fireEvent.dragEnter(child, withFiles())
    fireEvent.dragLeave(zone, withFiles())
    expect(screen.getByText('velo 1')).toBeInTheDocument()
    fireEvent.dragLeave(child, withFiles())
    expect(screen.queryByText(/velo/)).not.toBeInTheDocument()
  })

  it('arrastrar texto o elementos de la página no muestra el velo', () => {
    render(<Zone onFiles={vi.fn()} />)
    fireEvent.dragEnter(screen.getByTestId('zona'), withText)
    expect(screen.queryByText(/velo/)).not.toBeInTheDocument()
  })

  it('al soltar en la zona entrega los archivos y quita el velo', () => {
    const onFiles = vi.fn()
    render(<Zone onFiles={onFiles} />)
    const zone = screen.getByTestId('zona')
    fireEvent.dragEnter(zone, withFiles())
    fireEvent.dragOver(zone, withFiles())
    fireEvent.drop(screen.getByTestId('hijo'), withFiles())
    expect(onFiles).toHaveBeenCalledWith([file])
    expect(screen.queryByText(/velo/)).not.toBeInTheDocument()
  })

  it('sobre un editor el velo se oculta y lo que suelta el editor no se adjunta', () => {
    const onFiles = vi.fn()
    render(<Zone onFiles={onFiles} />)
    const editor = screen.getByTestId('editor')
    fireEvent.dragEnter(screen.getByTestId('zona'), withFiles())
    fireEvent.dragEnter(editor, withFiles())
    fireEvent.dragOver(editor, withFiles())
    expect(screen.getByText('sobre el editor')).toBeInTheDocument()

    // El editor corta el drop: el panel no lo ve, pero el velo igual se reinicia (drop en la ventana)
    fireEvent.drop(editor, withFiles())
    expect(onFiles).not.toHaveBeenCalled()
    expect(screen.queryByText(/sobre el editor|velo/)).not.toBeInTheDocument()
  })

  it('cancelar el arrastre (dragend) también lo reinicia', () => {
    render(<Zone onFiles={vi.fn()} />)
    fireEvent.dragEnter(screen.getByTestId('zona'), withFiles())
    act(() => {
      window.dispatchEvent(new Event('dragend'))
    })
    expect(screen.queryByText(/velo/)).not.toBeInTheDocument()
  })
})
