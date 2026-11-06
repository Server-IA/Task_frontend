import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { focusRowMain } from './focusReturn'

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

describe('focusRowMain', () => {
  it('un clic en una zona no enfocable de la fila enfoca su título, para que el foco vuelva ahí al cerrar el panel', async () => {
    function Row() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <div
            data-testid="fila"
            onClick={(event) => {
              focusRowMain(event.currentTarget)
              setOpen(true)
            }}
          >
            <span>PORT-9</span>
            <button type="button" data-row-main="">
              Logs estructurados
            </button>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent>
              <SheetTitle>Detalle</SheetTitle>
              <SheetDescription>Tarea</SheetDescription>
            </SheetContent>
          </Sheet>
        </>
      )
    }
    render(<Row />)
    const user = userEvent.setup()
    await user.click(screen.getByText('PORT-9'))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Logs estructurados' })).toHaveFocus())
  })
})

describe('la fila que abrió el panel ya no está al cerrarlo', () => {
  /** Lista filtrada: cambiar el estado en el panel saca la fila (como «Sin partir» al partir la historia). */
  function FilteredList({ initial }) {
    const [rows, setRows] = useState(initial)
    const [open, setOpen] = useState(null)
    return (
      <main>
        {rows.length === 0 && <p>Ninguna tarea</p>}
        <ul>
          {rows.map((code) => (
            <li key={code}>
              <button type="button" data-row-main="" onClick={() => setOpen(code)}>
                {code}
              </button>
            </li>
          ))}
        </ul>
        <Sheet open={Boolean(open)} onOpenChange={(value) => !value && setOpen(null)}>
          <SheetContent>
            <SheetTitle>Detalle</SheetTitle>
            <SheetDescription>Tarea</SheetDescription>
            <button type="button" onClick={() => setRows((current) => current.filter((code) => code !== open))}>
              Mover a In Progress
            </button>
          </SheetContent>
        </Sheet>
      </main>
    )
  }

  const openAndRemove = async (user, code) => {
    screen.getByRole('button', { name: code }).focus()
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('button', { name: 'Mover a In Progress' }))
    await user.keyboard('{Escape}')
    await closed()
  }

  it('va a la fila siguiente, no al body', async () => {
    const user = userEvent.setup()
    render(<FilteredList initial={['PORT-1', 'PORT-2', 'PORT-3']} />)
    await openAndRemove(user, 'PORT-2')
    expect(screen.getByRole('button', { name: 'PORT-3' })).toHaveFocus()
  })

  it('si era la última, a la anterior', async () => {
    const user = userEvent.setup()
    render(<FilteredList initial={['PORT-1', 'PORT-2']} />)
    await openAndRemove(user, 'PORT-2')
    expect(screen.getByRole('button', { name: 'PORT-1' })).toHaveFocus()
  })

  it('sin filas, al contenido de la página', async () => {
    const user = userEvent.setup()
    render(<FilteredList initial={['PORT-1']} />)
    await openAndRemove(user, 'PORT-1')
    expect(screen.getByRole('main')).toHaveFocus()
  })
})
