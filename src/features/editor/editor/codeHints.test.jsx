import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LinkPopover } from './LinkPopover'
import { TaskSearchPopover } from './TaskSearchPopover'

vi.mock('@/features/search/hooks', () => ({ useIssueSearch: () => ({ data: [], isFetching: false }) }))

const noop = () => {}
const initial = { text: '', href: '', existing: false }

describe('ayudas con un código de ejemplo', () => {
  it('el enlace usa el identificador del proyecto actual («PORT-12»), no WEB', () => {
    render(<LinkPopover initial={initial} style={{}} projectIdentifier="PORT" onApply={noop} onRemove={noop} onClose={noop} />)
    expect(screen.getByText('PORT-12')).toBeInTheDocument()
    expect(screen.queryByText(/WEB-12/)).not.toBeInTheDocument()
  })

  it('sin proyecto, un ejemplo genérico', () => {
    render(<LinkPopover initial={initial} style={{}} onApply={noop} onRemove={noop} onClose={noop} />)
    expect(screen.getByText('PROY-12')).toBeInTheDocument()
  })

  it('la búsqueda de tareas, igual', () => {
    render(<TaskSearchPopover slug="acme" style={{}} projectIdentifier="PORT" onSelect={noop} onClose={noop} />)
    expect(screen.getByText('Escribe un código («PORT-12») o parte del título')).toBeInTheDocument()
  })
})
