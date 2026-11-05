import { useRef, useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from './ConfirmDialog'

/** Una confirmación abierta por estado, como en la app (sin disparador propio). */
function WithButton({ removeOnConfirm = false }) {
  const [open, setOpen] = useState(false)
  const [gone, setGone] = useState(false)
  const fallback = useRef(null)
  const field = useRef(null)
  return (
    <>
      <input ref={field} aria-label="Campo" />
      <button ref={fallback}>Otro botón</button>
      {!gone && <button onClick={() => setOpen(true)}>Eliminar</button>}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="¿Eliminar?"
        confirmLabel="Sí, eliminar"
        returnFocusRef={fallback}
        focusAfterConfirmRef={removeOnConfirm ? undefined : field}
        onConfirm={() => {
          if (removeOnConfirm) setGone(true)
          setOpen(false)
        }}
      />
    </>
  )
}

function FromMenu() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>Acciones</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setOpen(true)}>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="¿Eliminar?" onConfirm={() => setOpen(false)} />
    </>
  )
}

const closed = () => waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

describe('ConfirmDialog: el foco al cerrarse', () => {
  it('al cancelar vuelve al botón que la abrió (no al body)', async () => {
    const user = userEvent.setup()
    render(<WithButton />)
    const trigger = screen.getByRole('button', { name: 'Eliminar' })
    await user.click(trigger)
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    await closed()
    expect(trigger).toHaveFocus()
  })

  it('con Escape, también', async () => {
    const user = userEvent.setup()
    render(<WithButton />)
    const trigger = screen.getByRole('button', { name: 'Eliminar' })
    await user.click(trigger)
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    await closed()
    expect(trigger).toHaveFocus()
  })

  it('abierta desde la opción de un menú, vuelve al botón del menú', async () => {
    const user = userEvent.setup()
    render(<FromMenu />)
    const trigger = screen.getByRole('button', { name: 'Acciones' })
    await user.click(trigger)
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }))
    await closed()
    expect(trigger).toHaveFocus()
  })

  it('confirmada, va a donde se sigue trabajando (focusAfterConfirmRef)', async () => {
    const user = userEvent.setup()
    render(<WithButton />)
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Sí, eliminar' }))
    await closed()
    expect(screen.getByRole('textbox', { name: 'Campo' })).toHaveFocus()
  })

  it('si la acción quitó el botón, va a returnFocusRef', async () => {
    const user = userEvent.setup()
    render(<WithButton removeOnConfirm />)
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Sí, eliminar' }))
    await closed()
    expect(screen.getByRole('button', { name: 'Otro botón' })).toHaveFocus()
  })
})
