import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { filesApi } from '@/features/files/api'
import { downloadFile } from '@/features/files/fileUrls'
import { MB, WORKSPACE_QUOTA } from '@/features/files/fileTypes'
import { StorageSettings } from './StorageSettings'

vi.mock('@/features/files/api', () => ({ filesApi: { report: vi.fn(), remove: vi.fn() } }))
vi.mock('@/features/files/fileUrls', async (importOriginal) => ({ ...(await importOriginal()), downloadFile: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

const web = { id: 'p1', name: 'Sitio web 2026', identifier: 'WEB', color: 'TEAL' }
const amc = { id: 'p2', name: 'App Móvil Clientes', identifier: 'AMC', color: 'AMBER' }
const report = {
  usage: { usedBytes: 1200 * MB, quotaBytes: WORKSPACE_QUOTA, percent: 58, warning: false, full: false },
  byType: [
    { type: 'IMAGES', bytes: 720 * MB, count: 120 },
    { type: 'DOCUMENTS', bytes: 390 * MB, count: 140 },
    { type: 'OTHER', bytes: 90 * MB, count: 15 },
  ],
  byProject: [
    { project: web, bytes: 900 * MB, count: 214 },
    { project: amc, bytes: 300 * MB, count: 61 },
  ],
  largest: [
    {
      id: 'f1',
      fileName: 'fotos-sesion-equipo.zip',
      contentType: 'application/zip',
      size: 9.8 * MB,
      image: false,
      project: web,
      issue: { id: 'i12', code: 'WEB-12', title: 'Rediseñar la portada', type: 'TASK' },
      uploadedBy: { id: 'u1', fullName: 'Ana Gómez' },
      createdAt: '2026-10-14T10:00:00Z',
    },
  ],
}

const workspace = { slug: 'equipo-diseno', name: 'Equipo Diseño', myRole: 'OWNER' }

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TooltipProvider>
          <StorageSettings workspace={workspace} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  // jsdom no lo trae: lo usan los tooltips de Radix al pasar el mouse por los botones
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => vi.clearAllMocks())

describe('Almacenamiento', () => {
  it('muestra el espacio usado, por tipo, por proyecto y los archivos más pesados', async () => {
    filesApi.report.mockResolvedValue(report)
    renderTab()

    expect(await screen.findByText('1,2 GB')).toBeInTheDocument()
    expect(screen.getByText('de 2 GB · 58 %')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Imágenes 720 MB, documentos 390 MB, otros 90 MB; quedan 0,8 GB' })).toBeInTheDocument()
    const legend = within(screen.getByRole('list', { name: 'Por tipo' }))
    expect(legend.getByText('720 MB')).toBeInTheDocument()
    expect(legend.getByText('0,8 GB')).toBeInTheDocument()
    expect(screen.getByText('214 archivos')).toBeInTheDocument()
    expect(screen.getByText('0,3 GB')).toBeInTheDocument()

    const row = screen.getByRole('row', { name: /fotos-sesion-equipo\.zip/ })
    expect(within(row).getByRole('link', { name: /WEB-12/ })).toHaveAttribute('href', '/equipo-diseno/projects/p1/issues?issue=i12')
    expect(within(row).getByText('9,8 MB')).toBeInTheDocument()
    expect(within(row).getByText(/Ana Gómez/)).toBeInTheDocument()
    expect(filesApi.report).toHaveBeenCalledWith('equipo-diseno')
  })

  it('descarga un archivo', async () => {
    filesApi.report.mockResolvedValue(report)
    downloadFile.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Descargar fotos-sesion-equipo.zip' }))
    expect(downloadFile).toHaveBeenCalledWith('f1')
  })

  it('elimina un archivo tras confirmar y vuelve a pedir el informe', async () => {
    filesApi.report.mockResolvedValue(report)
    filesApi.remove.mockResolvedValue({})
    const user = userEvent.setup()
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Eliminar fotos-sesion-equipo.zip' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('¿Eliminar fotos-sesion-equipo.zip?')).toBeInTheDocument()
    expect(within(dialog).getByText('Se quitará de WEB-12 y se liberarán 9,8 MB. No se puede deshacer.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(filesApi.remove).toHaveBeenCalledWith('equipo-diseno', 'p1', 'f1'))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Se eliminó fotos-sesion-equipo.zip'))
    await waitFor(() => expect(filesApi.report).toHaveBeenCalledTimes(2))
  })

  it('sin archivos lo dice en cada sección', async () => {
    filesApi.report.mockResolvedValue({
      usage: { usedBytes: 0, quotaBytes: WORKSPACE_QUOTA, percent: 0, warning: false, full: false },
      byType: report.byType.map((entry) => ({ ...entry, bytes: 0, count: 0 })),
      byProject: [],
      largest: [],
    })
    renderTab()

    expect(await screen.findByText('Todavía no hay archivos')).toBeInTheDocument()
    expect(screen.getByText('Ningún proyecto tiene archivos todavía.')).toBeInTheDocument()
    expect(screen.getByText('de 2 GB · 0 %')).toBeInTheDocument()
  })

  it('si falla, se puede reintentar', async () => {
    filesApi.report.mockRejectedValueOnce(new Error('caído')).mockResolvedValue(report)
    const user = userEvent.setup()
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('1,2 GB')).toBeInTheDocument()
  })
})
