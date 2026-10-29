import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { myWorkApi } from '../api'
import { MyWorkPage } from './MyWorkPage'

vi.mock('../api', () => ({ myWorkApi: { get: vi.fn() } }))
vi.mock('@/features/projects/hooks', () => ({ useProjects: () => ({ data: [] }) }))

// jsdom no trae ResizeObserver (lo usa el selector de vistas)
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const issue = (id, code, dueDate) => ({
  id,
  code,
  title: `Tarea ${code}`,
  projectId: 'p1',
  priority: 'NONE',
  dueDate,
  state: { id: 's', name: 'En curso', group: 'STARTED', color: '#F59E0B' },
  blockedByCount: 0,
})

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/equipo/mi-trabajo']}>
        <Routes>
          <Route path="/:slug/mi-trabajo" element={<MyWorkPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MyWorkPage', () => {
  it('usa los contadores del backend: proyectos, vencidas, estados en curso y próxima fecha', async () => {
    myWorkApi.get.mockResolvedValue({
      issues: [issue('1', 'WEB-2', '2020-01-01'), issue('2', 'WEB-4', null)],
      assignedCount: 7,
      createdCount: 4,
      commentedCount: 3,
      completedThisWeek: 4,
      inProgressCount: 3,
      overdueCount: 1,
      projectCount: 2,
      byState: [
        { name: 'Por hacer', group: 'UNSTARTED', color: '#3A3A3A', count: 4 },
        { name: 'En curso', group: 'STARTED', color: '#F59E0B', count: 2 },
        { name: 'En revisión', group: 'STARTED', color: '#8B5CF6', count: 1 },
      ],
      nextDue: { id: '19', code: 'WEB-19', title: 'Formulario', dueDate: '2999-01-01', project: { id: 'p1' } },
    })
    renderPage()
    expect(await screen.findByText(/7 tareas asignadas a ti en 2 proyectos/)).toBeInTheDocument()
    expect(screen.getByText('1 vencida')).toBeInTheDocument()
    const week = screen.getByRole('region', { name: 'Tu semana' })
    expect(week).toHaveTextContent('4cerradas')
    expect(week).toHaveTextContent('2en curso')
    expect(week).toHaveTextContent('1en revisión')
    expect(screen.getByRole('link', { name: 'WEB-19' })).toHaveAttribute('href', '/equipo/projects/p1/issues?issue=19')
  })
})
