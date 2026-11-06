import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Calendar } from './calendar'

describe('Calendar', () => {
  it('los textos para lectores de pantalla están en español (no «Go to the Previous Month» ni «Today»)', () => {
    render(<Calendar mode="single" defaultMonth={new Date(2026, 10, 1)} today={new Date(2026, 10, 5)} />)
    expect(screen.getByRole('button', { name: 'Ir al mes anterior' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ir al mes siguiente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Hoy, jueves, 5 de noviembre de 2026/ })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: /noviembre/i })).toBeInTheDocument()
  })
})
