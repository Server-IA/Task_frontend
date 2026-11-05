import { act, fireEvent, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { isInToaster, keepOpenOnToast } from './toastLayer'

// jsdom no tiene captura del puntero (sonner la usa al tocar un aviso)
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.hasPointerCapture ??= () => false

describe('keepOpenOnToast', () => {
  it('no deja cerrar el panel por un clic en un aviso, y sí por uno en otro lado', () => {
    const toaster = document.createElement('ol')
    toaster.setAttribute('data-sonner-toaster', '')
    const button = document.createElement('button')
    toaster.append(button)
    const own = vi.fn()
    const onToast = { target: button, preventDefault: vi.fn() }
    const elsewhere = { target: document.body, preventDefault: vi.fn() }

    keepOpenOnToast(own)(onToast)
    keepOpenOnToast(own)(elsewhere)

    expect(onToast.preventDefault).toHaveBeenCalled()
    expect(elsewhere.preventDefault).not.toHaveBeenCalled()
    expect(own).toHaveBeenCalledTimes(2)
    expect(isInToaster(button)).toBe(true)
    expect(isInToaster(null)).toBe(false)
  })

  it('el botón de un aviso funciona con un panel abierto y no lo cierra', async () => {
    const onUndo = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <>
        <Sheet open onOpenChange={onOpenChange}>
          <SheetContent>
            <SheetTitle>Tarea</SheetTitle>
            <SheetDescription>Panel</SheetDescription>
          </SheetContent>
        </Sheet>
        <Toaster />
      </>,
    )
    act(() => {
      toast.success('PORT-35 creada como subtarea', { action: { label: 'Deshacer', onClick: onUndo } })
    })
    const undo = await screen.findByRole('button', { name: 'Deshacer' })
    // Radix apaga los clics fuera del panel; los avisos los recuperan
    expect(undo.closest('[data-sonner-toaster]')).toHaveClass('pointer-events-auto')

    fireEvent.pointerDown(undo)
    fireEvent.focus(undo)
    fireEvent.click(undo)

    expect(onUndo).toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
