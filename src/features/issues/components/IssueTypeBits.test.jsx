import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReadyBadge, StoryProgressSummary } from './IssueTypeBits'

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

describe('StoryProgressSummary (fila «Progreso» de la historia)', () => {
  const open = { state: { group: 'STARTED' }, storyTaskCount: 3, storyTaskDoneCount: 1 }

  it('muestra los bugs abiertos, como la lista de historias', () => {
    render(<StoryProgressSummary story={{ ...open, openBugCount: 2 }} />)
    expect(screen.getByText('1 de 3 tareas')).toBeInTheDocument()
    expect(screen.getByText('2 bugs abiertos')).toBeInTheDocument()
  })

  it('sin bugs abiertos no muestra la insignia; en una cerrada, solo los de después de cerrar', () => {
    const { unmount } = render(<StoryProgressSummary story={open} />)
    expect(screen.queryByText(/bugs? abiertos?/)).not.toBeInTheDocument()
    unmount()
    render(<StoryProgressSummary story={{ ...open, state: { group: 'COMPLETED' }, openBugCount: 2, bugsAfterCloseCount: 1 }} />)
    expect(screen.queryByText(/bugs? abiertos?/)).not.toBeInTheDocument()
    expect(screen.getByText('+1 bug')).toBeInTheDocument()
  })
})
