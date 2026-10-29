import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReadyBadge } from './IssueTypeBits'

describe('ReadyBadge', () => {
  it('por defecto es una sola línea que no se achica (listas y tablero)', () => {
    render(<ReadyBadge />)
    const badge = screen.getByTitle(/Todas sus tareas terminadas/)
    expect(badge).toHaveClass('shrink-0', 'whitespace-nowrap')
  })

  it('con wrap se puede achicar y partir en dos líneas (columna de propiedades)', () => {
    render(<ReadyBadge wrap />)
    const badge = screen.getByTitle(/Todas sus tareas terminadas/)
    // Con shrink-0 el texto no se partía y la insignia se salía del panel
    expect(badge).not.toHaveClass('shrink-0')
    expect(badge).not.toHaveClass('whitespace-nowrap')
    expect(badge).toHaveClass('min-w-0', 'shrink', 'whitespace-normal')
  })
})
