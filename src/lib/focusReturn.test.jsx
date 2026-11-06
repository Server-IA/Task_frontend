import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

/** Un diálogo abierto por estado, como en la app (sin disparador de Radix): la tarjeta o la tecla «c». */
function Controlled({ as = 'dialog', onCloseAutoFocus, autoFocus = false }) {
  const [open, setOpen] = useState(false)
  const [Root, Content, Title, Description] =
    as === 'sheet' ? [Sheet, SheetContent, SheetTitle, SheetDescription] : [Dialog, DialogContent, DialogTitle, DialogDescription]
  return (
    <>
      <button onClick={() => setOpen(true)}>PORT-9</button>
      <button>Otro</button>
      <Root open={open} onOpenChange={setOpen}>
        <Content onCloseAutoFocus={onCloseAutoFocus}>
          <Title>Detalle</Title>
          <Description>Propiedades</Description>
          <input aria-label="Título" autoFocus={autoFocus} />
        </Content>
      </Root>
    </>
  )
}

const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

describe('diálogos y paneles abiertos por estado: el foco al cerrarse', () => {
  it.each(['dialog', 'sheet'])('%s: con Escape vuelve a lo que lo abrió, no al body', async (as) => {
    const user = userEvent.setup()
    render(<Controlled as={as} />)
    const card = screen.getByRole('button', { name: 'PORT-9' })
    card.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await closed()
    expect(card).toHaveFocus()
  })

  it('también si un campo con autoFocus toma el foco al abrirse (el diálogo de nueva tarea)', async () => {
    const user = userEvent.setup()
    render(<Controlled autoFocus />)
    const card = screen.getByRole('button', { name: 'PORT-9' })
    card.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('textbox', { name: 'Título' })).toHaveFocus()
    await user.keyboard('{Escape}')
    await closed()
    expect(card).toHaveFocus()
  })

  it('respeta a quien decide otra cosa al cerrar (preventDefault)', async () => {
    const user = userEvent.setup()
    render(<Controlled onCloseAutoFocus={(event) => event.preventDefault()} />)
    const card = screen.getByRole('button', { name: 'PORT-9' })
    card.focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await closed()
    expect(card).not.toHaveFocus()
  })
})
