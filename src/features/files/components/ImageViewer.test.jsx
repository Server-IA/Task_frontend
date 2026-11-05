import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ImageViewer } from './ImageViewer'

vi.mock('./FileImage', () => ({ useResolvedSrc: (src) => ({ url: `blob:${src}`, loading: false, missing: false }) }))
vi.mock('../fileUrls', () => ({ useFileUrl: () => ({ data: { url: 'https://r2.test/imagen' } }), downloadFile: vi.fn() }))

const images = [
  { id: 'img-1', name: 'mockup-perfil.png', group: 'adjuntos' },
  { id: 'img-2', name: 'recorte-foto.png', group: 'comentarios', author: { fullName: 'Mateo Herrera' } },
]

/** El panel de la tarea (un Sheet modal de Radix) con una imagen de un comentario que abre el visor. */
function TaskPanel({ onPanelChange }) {
  const [index, setIndex] = useState(null)
  return (
    <Sheet open onOpenChange={onPanelChange}>
      <SheetContent>
        <SheetTitle>Detalle de la tarea</SheetTitle>
        <SheetDescription>Propiedades, subtareas y actividad</SheetDescription>
        <button type="button" onClick={() => setIndex(1)}>
          Ver recorte-foto.png
        </button>
        {index !== null && (
          <ImageViewer images={images} index={index} issueCode="PORT-20" onIndexChange={setIndex} onClose={() => setIndex(null)} />
        )}
      </SheetContent>
    </Sheet>
  )
}

describe('ImageViewer dentro del panel de la tarea', () => {
  it('se puede usar (no hereda los clics bloqueados del panel) y al cerrarse deja el panel abierto con el foco', async () => {
    const user = userEvent.setup()
    const onPanelChange = vi.fn()
    render(<TaskPanel onPanelChange={onPanelChange} />)
    const opener = screen.getByRole('button', { name: 'Ver recorte-foto.png' })
    const viewer = () => screen.queryByRole('dialog', { name: 'Visor de imágenes de PORT-20' })

    await user.click(opener)
    expect(viewer()).toBeInTheDocument()
    expect(viewer()).toHaveTextContent('2 de 2')

    // El panel deja el body sin clics: user-event falla si el visor los hereda
    await user.click(screen.getByRole('button', { name: 'Imagen siguiente: mockup-perfil.png' }))
    expect(viewer()).toHaveTextContent('1 de 2')
    await user.keyboard('{ArrowLeft}')
    expect(viewer()).toHaveTextContent('2 de 2')

    await user.click(screen.getByRole('button', { name: 'Cerrar (Esc)' }))
    expect(viewer()).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Detalle de la tarea' })).toBeInTheDocument()
    expect(opener).toHaveFocus()

    await user.click(opener)
    await user.keyboard('{Escape}')
    expect(viewer()).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Detalle de la tarea' })).toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(onPanelChange).not.toHaveBeenCalled()
  })
})
