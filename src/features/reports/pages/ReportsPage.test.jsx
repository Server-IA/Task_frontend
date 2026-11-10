import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob } from '@/lib/download'
import { reportsApi } from '../api'
import { ReportsPage } from './ReportsPage'

vi.mock('@/features/workspaces/hooks', () => ({ useCurrentWorkspace: () => ({ slug: 'acme', name: 'Acme' }) }))
vi.mock('@/features/projects/hooks', () => ({ useCurrentProject: () => ({ id: 'p1', name: 'Portal', identifier: 'PORT' }) }))
vi.mock('@/features/issues/useIssueHelpers', () => ({ useProjectMeta: () => ({ states: [], users: [], labels: [] }) }))
vi.mock('@/features/planning/hooks', () => ({ usePlanningList: () => ({ data: [] }) }))
vi.mock('../api', () => ({ reportsApi: { previewIssues: vi.fn(), issuesPdf: vi.fn() } }))
vi.mock('@/lib/download', () => ({ downloadBlob: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
})

const preview = (total) => ({
  totalMatching: total,
  truncated: false,
  maxIssues: 1000,
  totals: { total, open: total, completed: 0, cancelled: 0, overdue: total ? 1 : 0 },
  byState: total ? [{ name: 'Todo', count: total }] : [],
  byPriority: total ? [{ name: 'Alta', count: total }] : [],
  byAssignee: total ? [{ name: 'Ana Ruiz', count: total }] : [],
  byType: total ? [{ name: 'Tarea', count: total }] : [],
})

function renderPage(url = '/acme/projects/p1/reports') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[url]}>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReportsPage', () => {
  beforeEach(() => {
    reportsApi.previewIssues.mockReset()
    reportsApi.issuesPdf.mockReset()
    downloadBlob.mockReset()
  })

  it('muestra la vista previa y descarga el PDF con los filtros de la URL y las opciones', async () => {
    reportsApi.previewIssues.mockResolvedValue(preview(4))
    const blob = new Blob(['%PDF-'], { type: 'application/pdf' })
    reportsApi.issuesPdf.mockResolvedValue(blob)
    renderPage('/acme/projects/p1/reports?priority=HIGH')

    expect(await screen.findByText('Por persona')).toBeInTheDocument()
    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument()
    // La vista previa pide solo lo que decide qué tareas entran (por defecto, tareas y bugs)
    expect(reportsApi.previewIssues).toHaveBeenCalledWith('acme', 'p1', { priority: ['HIGH'], type: ['TASK', 'BUG'] })

    await userEvent.click(screen.getByRole('switch', { name: 'Resumen' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Generar PDF' })[0])

    await waitFor(() => expect(downloadBlob).toHaveBeenCalled())
    expect(reportsApi.issuesPdf).toHaveBeenCalledWith('acme', 'p1', {
      priority: ['HIGH'],
      type: ['TASK', 'BUG'],
      groupBy: 'STATE',
      sort: 'PRIORITY',
      summary: false,
    })
    expect(downloadBlob.mock.calls[0][0]).toBe(blob)
    expect(downloadBlob.mock.calls[0][1]).toMatch(/^reporte-tareas-PORT-\d{4}-\d{2}-\d{2}\.pdf$/)
  })

  it('sin tareas que cumplan los filtros no deja generar', async () => {
    reportsApi.previewIssues.mockResolvedValue(preview(0))
    renderPage()

    expect(await screen.findByText(/Ninguna tarea cumple estos filtros/)).toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: 'Generar PDF' })) expect(button).toBeDisabled()
  })

  it('sin secciones avisa y no deja generar', async () => {
    reportsApi.previewIssues.mockResolvedValue(preview(2))
    renderPage()
    await screen.findByText('Por persona')

    await userEvent.click(screen.getByRole('switch', { name: 'Resumen' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Listado de tareas' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Deja al menos una sección')
    for (const button of screen.getAllByRole('button', { name: 'Generar PDF' })) expect(button).toBeDisabled()
  })
})
