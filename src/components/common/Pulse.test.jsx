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
