import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { cyclesApi } from '../api'
import { CloseCycleDialog } from './CloseCycleDialog'

vi.mock('../api', () => ({
  cyclesApi: { list: vi.fn(), closePreview: vi.fn(), close: vi.fn() },
  modulesApi: {},
}))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
})

const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez' }
const todo = { id: 's1', name: 'Por hacer', group: 'UNSTARTED', color: '#3A3A3A' }
const related = (id, code, extra = {}) => ({ id, code, title: `Tarea ${code}`, state: todo, assignees: [luis], blockedByCount: 0, ...extra })
const cycle = { id: 'c1', name: 'Sprint 1', startDate: '2026-10-15', endDate: '2099-10-29', status: 'CURRENT', progress: { totalIssues: 4, completedIssues: 2, percentage: 50 } }
const next = { id: 'c2', name: 'Sprint 2', startDate: '2099-10-30', endDate: '2099-11-12', progress: { totalIssues: 3 } }

describe('CloseCycleDialog', () => {
  it('muestra la mediana de En curso a Hecho, las bloqueadas y el aviso al equipo', async () => {
    cyclesApi.list.mockResolvedValue([cycle, next])
    cyclesApi.closePreview.mockResolvedValue({
      cycle,
      completed: [related('a', 'WEB-1')],
      unfinished: [related('b', 'WEB-4'), related('c', 'WEB-15', { blockedByCount: 1 })],
      completedCount: 2,
      unfinishedCount: 2,
      cycleTimeDays: 3.4,
      nextCycle: next,
    })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <CloseCycleDialog slug="equipo" projectId="p1" cycle={cycle} open onOpenChange={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('mediana, de En curso a Hecho')).toBeInTheDocument()
    expect(screen.getByText('Abre la retro con el resumen del ciclo ya cargado y avisa al equipo.')).toBeInTheDocument()
    // La bloqueada se marca con el dato de la vista previa (sin pedir las tareas aparte)
    expect(screen.getAllByText(/bloqueada/)).toHaveLength(1)

    // WEB-15 al backlog a mano: el texto explica por qué
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Destino de WEB-15' }))
    await user.click(await screen.findByRole('option', { name: 'Backlog' }))
    expect(screen.getByText(/WEB-15 va al backlog porque sigue bloqueada\./)).toBeInTheDocument()
  })
})
