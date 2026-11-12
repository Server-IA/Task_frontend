import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CountUp, PulseOnChange, StrikeText } from './Pulse'

describe('PulseOnChange', () => {
  it('no hace el pulso al pintarse; sí cuando el valor cambia', () => {
    const { rerender } = render(<PulseOnChange value={3} />)
    expect(screen.getByText('3')).not.toHaveClass('tf-pulse')
    rerender(<PulseOnChange value={3} />)
    expect(screen.getByText('3')).not.toHaveClass('tf-pulse')
    rerender(<PulseOnChange value={4} />)
    expect(screen.getByText('4')).toHaveClass('tf-pulse')
  })

  it('en espera muestra el valor al día sin pulso; al soltar hace uno solo si quedó distinto', () => {
    const { rerender } = render(<PulseOnChange value={3} />)
    rerender(<PulseOnChange value={4} hold />)
    expect(screen.getByText('4')).not.toHaveClass('tf-pulse')
    rerender(<PulseOnChange value={3} hold />)
    rerender(<PulseOnChange value={3} />)
    expect(screen.getByText('3')).not.toHaveClass('tf-pulse')
    rerender(<PulseOnChange value={5} hold />)
    rerender(<PulseOnChange value={5} />)
    expect(screen.getByText('5')).toHaveClass('tf-pulse')
  })

  it('conocer el valor (de cargando a su número) no es un cambio', () => {
    const { rerender } = render(<PulseOnChange value={undefined} show={false} />)
    rerender(<PulseOnChange value="3" />)
    expect(screen.getByText('3')).not.toHaveClass('tf-pulse')
  })

  it('oculto no pinta nada, pero lo que aparece por un cambio sí hace el pulso', () => {
    const { rerender, container } = render(<PulseOnChange value="0" show={false} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<PulseOnChange value="1" show />)
    expect(screen.getByText('1')).toHaveClass('tf-pulse')
  })
})

describe('CountUp', () => {
  it('sin animar es el número tal cual', () => {
    render(
      <p>
        <CountUp value={78} />%
      </p>,
    )
    expect(screen.getByText('78%')).toBeInTheDocument()
  })
})

describe('StrikeText', () => {
  it('lo que ya estaba hecho va tachado sin animación', () => {
    render(<StrikeText done>Paleta de colores</StrikeText>)
    expect(screen.getByText('Paleta de colores')).toHaveClass('line-through')
    expect(screen.getByText('Paleta de colores')).not.toHaveClass('tf-strike-in')
  })

  it('lo que se completa estando en pantalla se tacha con la animación, y al reabrirlo se destacha', () => {
    const { rerender } = render(<StrikeText done={false}>Pantalla de pago</StrikeText>)
    expect(screen.getByText('Pantalla de pago')).not.toHaveClass('line-through')
    rerender(<StrikeText done>Pantalla de pago</StrikeText>)
    expect(screen.getByText('Pantalla de pago')).toHaveClass('tf-strike-in')
    rerender(<StrikeText done={false}>Pantalla de pago</StrikeText>)
    expect(screen.getByText('Pantalla de pago')).not.toHaveClass('tf-strike-in')
    expect(screen.getByText('Pantalla de pago')).not.toHaveClass('line-through')
  })
})
