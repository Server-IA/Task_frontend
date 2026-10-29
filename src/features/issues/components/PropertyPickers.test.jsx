import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { DatePicker, LabelsPicker } from './PropertyPickers'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
})

const labels = [
  { id: 'l-bug', name: 'bug', color: '#f00' },
  { id: 'l-front', name: 'frontend', color: '#00f' },
]

describe('LabelsPicker', () => {
  it('dos opciones marcadas antes de que responda el backend se suman (no se pisan)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    // `value` no cambia: el PATCH todavía no volvió
    render(<LabelsPicker labels={labels} value={[]} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Etiquetas' }))
    await user.click(screen.getByRole('option', { name: /bug/ }))
    await user.click(screen.getByRole('option', { name: /frontend/ }))

    expect(onChange).toHaveBeenNthCalledWith(1, ['l-bug'])
    expect(onChange).toHaveBeenNthCalledWith(2, ['l-bug', 'l-front'])
  })

  it('al volver a abrir parte del valor que llegó', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<LabelsPicker labels={labels} value={[]} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Etiquetas' }))
    await user.click(screen.getByRole('option', { name: /bug/ }))
    await user.keyboard('{Escape}')

    rerender(<LabelsPicker labels={labels} value={['l-front']} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /Etiquetas|frontend/ }))
    await user.click(screen.getByRole('option', { name: /bug/ }))
    expect(onChange).toHaveBeenLastCalledWith(['l-front', 'l-bug'])
  })
})

describe('DatePicker', () => {
  it('con labelId el botón se nombra con la etiqueta y la fecha', () => {
    render(
      <>
        <span id="inicio">Inicio</span>
        <DatePicker value="2026-11-03" onChange={() => {}} placeholder="Sin fecha" labelId="inicio" />
      </>,
    )
    expect(screen.getByRole('button', { name: /^Inicio 3 nov/ })).toBeInTheDocument()
  })

  it('sin fecha dice «Inicio Sin fecha»', () => {
    render(
      <>
        <span id="inicio">Inicio</span>
        <DatePicker value={null} onChange={() => {}} placeholder="Sin fecha" labelId="inicio" />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Inicio Sin fecha' })).toBeInTheDocument()
  })
})
