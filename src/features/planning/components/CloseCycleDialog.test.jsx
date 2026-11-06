import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { retroApi } from '@/features/retro/api'
import { cyclesApi } from '../api'
import { CloseCycleDialog } from './CloseCycleDialog'

vi.mock('../api', () => ({
  cyclesApi: { list: vi.fn(), closePreview: vi.fn(), close: vi.fn() },
  modulesApi: {},
}))
vi.mock('@/features/retro/api', () => ({ retroApi: { get: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

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

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CloseCycleDialog slug="equipo" projectId="p1" cycle={cycle} open onOpenChange={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CloseCycleDialog', () => {
  it('muestra la mediana de En curso a Hecho, las bloqueadas y el aviso al equipo', async () => {
    retroApi.get.mockResolvedValue({ started: false, finishedAt: null })
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

  it('con la retro ya empezada no la ofrece ni dice que se abrió y avisó al equipo', async () => {
    retroApi.get.mockResolvedValue({ started: true, finishedAt: '2026-11-05T12:00:00Z' })
    cyclesApi.list.mockResolvedValue([cycle])
    cyclesApi.closePreview.mockResolvedValue({
      cycle,
      completed: [],
      unfinished: [],
      completedCount: 0,
      unfinishedCount: 0,
      cycleTimeDays: null,
      nextCycle: null,
    })
    // El backend responde retroStarted = «la retro está abierta», aunque la haya abierto antes otra persona
    cyclesApi.close.mockResolvedValue({ cycle, movedToCycle: 0, movedToBacklog: 0, retroStarted: true, retroStartedNow: false })
    renderDialog()
    expect(await screen.findByText('La retrospectiva de este ciclo ya terminó.')).toBeInTheDocument()
    expect(screen.queryByText('Empezar la retrospectiva')).not.toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Cerrar Sprint 1/ }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(cyclesApi.close.mock.calls[0].at(-1)).toMatchObject({ startRetro: false })
    expect(toast.success.mock.calls[0][1].description).not.toMatch(/Se abrió la retro/)
  })

  const emptyPreview = { cycle, completed: [], unfinished: [], completedCount: 0, unfinishedCount: 0, cycleTimeDays: null, nextCycle: null }

  it('si este cierre abrió la retro (retroStartedNow), dice que se avisó al equipo', async () => {
    toast.success.mockClear()
    retroApi.get.mockResolvedValue({ started: false, finishedAt: null })
    cyclesApi.list.mockResolvedValue([cycle])
    cyclesApi.closePreview.mockResolvedValue(emptyPreview)
    cyclesApi.close.mockResolvedValue({ cycle, movedToCycle: 0, movedToBacklog: 0, retroStarted: true, retroStartedNow: true })
    renderDialog()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Cerrar Sprint 1/ }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(cyclesApi.close.mock.calls.at(-1).at(-1)).toMatchObject({ startRetro: true })
    expect(toast.success.mock.calls[0][1].description).toMatch(/Se abrió la retro y se avisó al equipo\./)
  })

  it('si otra persona la abrió mientras tanto (retroStarted sin retroStartedNow), no dice que se avisó', async () => {
    toast.success.mockClear()
    // Al abrir el diálogo la retro no había empezado: se pide abrirla al cerrar
    retroApi.get.mockResolvedValue({ started: false, finishedAt: null })
    cyclesApi.list.mockResolvedValue([cycle])
    cyclesApi.closePreview.mockResolvedValue(emptyPreview)
    cyclesApi.close.mockResolvedValue({ cycle, movedToCycle: 0, movedToBacklog: 0, retroStarted: true, retroStartedNow: false })
    renderDialog()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Cerrar Sprint 1/ }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(cyclesApi.close.mock.calls.at(-1).at(-1)).toMatchObject({ startRetro: true })
    expect(toast.success.mock.calls[0][1].description).not.toMatch(/avisó/)
  })
})
