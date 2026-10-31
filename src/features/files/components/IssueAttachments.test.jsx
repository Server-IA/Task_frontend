import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/stores/sessionStore'
import { ImageViewerContext } from '../imageViewerContext'
import { IssueAttachments } from './IssueAttachments'

const MB = 1024 * 1024
const ana = { id: 'ana', fullName: 'Ana Gómez' }
const luis = { id: 'luis', fullName: 'Luis Muñoz Pérez' }
const stored = (id, fileName, extra) => ({
  id,
  fileName,
  contentType: 'application/pdf',
  size: 2.4 * MB,
  image: false,
  uploadedBy: ana,
  createdAt: new Date().toISOString(),
  reference: `/files/${id}`,
  ...extra,
})

let attachments = []
let tasks = []
let usage = { usedBytes: 0, quotaBytes: 2048 * MB, percent: 0, warning: false, full: false }
let role = 'MEMBER'
const remove = { mutate: vi.fn(), isPending: false, variables: undefined }
const attach = vi.fn()
const queue = { cancel: vi.fn(), retry: vi.fn(), dismiss: vi.fn() }
const download = vi.fn(() => Promise.resolve())
const openInTab = vi.fn(() => Promise.resolve())

vi.mock('../hooks', () => ({
  useAttachments: () => ({ data: attachments, isLoading: false }),
  useAttachFiles: () => attach,
  useDeleteFile: () => remove,
  useStorageUsage: () => ({ data: usage }),
}))
vi.mock('../uploads', () => ({
  attachmentScope: (issueId) => `attachments:${issueId}`,
  useUploads: () => ({ tasks, queue }),
}))
vi.mock('../fileUrls', () => ({ downloadFile: (id) => download(id), openFileInNewTab: (id) => openInTab(id) }))
vi.mock('./FileImage', () => ({ FileImage: ({ alt }) => <img alt={alt} /> }))
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspace: () => ({ data: { myRole: role } }) }))

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  attachments = []
  tasks = []
  usage = { usedBytes: 0, quotaBytes: 2048 * MB, percent: 0, warning: false, full: false }
  role = 'MEMBER'
  useSessionStore.setState({ user: { id: 'ana', fullName: 'Ana Gómez' } })
})

const issue = { id: 'i1', code: 'WEB-15', title: 'Pantalla de perfil de usuario' }
const viewer = { open: vi.fn() }
const renderSection = (props) =>
  render(
    <ImageViewerContext.Provider value={viewer}>
      <IssueAttachments slug="acme" projectId="p1" issue={issue} {...props} />
    </ImageViewerContext.Provider>,
  )

describe('Adjuntos', () => {
  it('encabezado con cuántos y cuánto pesan; las imágenes abren el visor y el PDF otra pestaña', async () => {
    const user = userEvent.setup()
    attachments = [
      stored('img-1', 'mockup-perfil.png', { image: true, contentType: 'image/png', size: 2.8 * MB }),
      stored('pdf-1', 'requisitos.pdf'),
    ]
    renderSection()

    expect(screen.getByRole('heading', { name: /Adjuntos/ })).toHaveTextContent('2 · 5,2 MB')
    await user.click(screen.getByRole('button', { name: 'Ver mockup-perfil.png' }))
    expect(viewer.open).toHaveBeenCalledWith('img-1')
    await user.click(screen.getByText('requisitos.pdf'))
    expect(openInTab).toHaveBeenCalledWith('pdf-1')
    await user.click(screen.getByRole('button', { name: 'Descargar requisitos.pdf' }))
    expect(download).toHaveBeenCalledWith('pdf-1')
  })

  it('quien lo subió lo elimina después de confirmar en la misma fila', async () => {
    const user = userEvent.setup()
    attachments = [stored('pdf-1', 'requisitos.pdf')]
    renderSection()

    await user.click(screen.getByRole('button', { name: 'Más acciones para requisitos.pdf' }))
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar…' }))
    const confirm = screen.getByRole('alertdialog', { name: '¿Eliminar requisitos.pdf?' })
    expect(confirm).toHaveTextContent('Se borra para todo el proyecto y no se puede deshacer.')
    expect(remove.mutate).not.toHaveBeenCalled()

    await user.click(within(confirm).getByRole('button', { name: 'Eliminar' }))
    expect(remove.mutate).toHaveBeenCalledWith('pdf-1', expect.anything())
  })

  it('otro miembro no puede eliminarlo; el PM sí', async () => {
    const user = userEvent.setup()
    attachments = [stored('doc-1', 'textos-perfil.docx', { uploadedBy: luis })]
    const { unmount } = renderSection()

    await user.click(screen.getByRole('button', { name: 'Más acciones para textos-perfil.docx' }))
    expect(screen.queryByRole('menuitem', { name: 'Eliminar…' })).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /Solo Luis \(quien lo subió\) o el PM/ })).toHaveAttribute('aria-disabled', 'true')
    unmount()

    role = 'OWNER'
    renderSection()
    await user.click(screen.getByRole('button', { name: 'Más acciones para textos-perfil.docx' }))
    expect(screen.getByRole('menuitem', { name: 'Eliminar…' })).toBeInTheDocument()
  })

  it('las subidas: avance y cancelar, en cola, y errores con «Reintentar» solo cuando sirve', async () => {
    const user = userEvent.setup()
    const task = (id, name, extra) => ({ id, name, size: 2 * MB, contentType: '', progress: 0, error: null, retryable: false, result: null, ...extra })
    tasks = [
      task('u1', 'iconos-perfil.zip', { status: 'uploading', progress: 0.46 }),
      task('u2', 'paleta.png', { status: 'queued' }),
      task('u3', 'paleta-final.png', { status: 'error', error: 'Se cortó la conexión al 70 %.', retryable: true }),
      task('u4', 'fuentes.exe', { status: 'error', error: 'Este tipo de archivo no se puede adjuntar.' }),
    ]
    renderSection()

    expect(screen.getByText('Subiendo… 46 %')).toBeInTheDocument()
    expect(screen.getByText('En cola')).toBeInTheDocument()
    expect(screen.getByText('Este tipo de archivo no se puede adjuntar.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Reintentar' })).toHaveLength(1)
    // Dos en curso: la pastilla que las resume
    expect(screen.getByRole('status')).toHaveTextContent('Subiendo 2 archivos')

    await user.click(screen.getByRole('button', { name: 'Cancelar subida: iconos-perfil.zip' }))
    expect(queue.cancel).toHaveBeenCalledWith('u1')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(queue.retry).toHaveBeenCalledWith('u3')
    await user.click(screen.getByRole('button', { name: 'Quitar de la lista: fuentes.exe' }))
    expect(queue.dismiss).toHaveBeenCalledWith('u4')
  })

  it('sin adjuntos: la línea para arrastrar o elegir archivos', () => {
    renderSection()
    expect(screen.getByText(/Arrastra archivos al panel o/)).toBeInTheDocument()
    expect(screen.getByText('hasta 10 MB · imágenes 5 MB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Adjuntar/ })).toBeEnabled()
  })

  it('con el espacio lleno no se puede adjuntar y lo explica; al 90 %, un aviso', () => {
    usage = { usedBytes: 2048 * MB, quotaBytes: 2048 * MB, percent: 100, warning: true, full: true }
    const { unmount } = renderSection()
    expect(screen.getByRole('button', { name: /Adjuntar/ })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('El workspace llegó a su límite de 2 GB.')
    unmount()

    usage = { usedBytes: 1900 * MB, quotaBytes: 2048 * MB, percent: 92, warning: true, full: false }
    renderSection()
    expect(screen.getByRole('button', { name: /Adjuntar/ })).toBeEnabled()
    expect(screen.getByText(/El workspace usa el 92 % de su espacio/)).toBeInTheDocument()
  })
})
