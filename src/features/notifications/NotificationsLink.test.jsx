import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotificationsLink } from './NotificationsLink'

vi.mock('./hooks', () => ({ useUnreadCount: () => ({ data: 7 }) }))

describe('NotificationsLink', () => {
  it('contraído, el enlace anuncia cuántos avisos hay sin leer', () => {
    render(
      <TooltipProvider>
        <MemoryRouter>
          <NotificationsLink collapsed />
        </MemoryRouter>
      </TooltipProvider>,
    )
    expect(screen.getByRole('link', { name: 'Bandeja, 7 sin leer' })).toBeInTheDocument()
  })

  it('expandido, el número se ve junto al nombre', () => {
    render(
      <MemoryRouter>
        <NotificationsLink collapsed={false} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Bandeja\s*7/ })).toBeInTheDocument()
  })
})
