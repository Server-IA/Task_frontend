import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { checklistApi } from '@/features/checklist/api'
import { useSessionStore } from '@/stores/sessionStore'
import { issuesApi } from '../api'
import { IssueDescription } from './IssueDescription'

vi.mock('../api', () => ({ issuesApi: { get: vi.fn(), update: vi.fn() } }))
vi.mock('@/features/checklist/api', () => ({ checklistApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))
// El editor real no se monta: el falso guarda sus props para escribir (onChange) y terminar (onSubmit)
const editor = vi.hoisted(() => ({ props: null }))
vi.mock('@/features/editor/components/LazyRichEditor', () => ({
  LazyRichEditor: (props) => {
    editor.props = props
    return null
  },
  preloadRichEditor: () => {},
  usePreloadRichEditor: () => {},
}))

const project = { id: 'p1' }

function renderDescription(description, { strict = false } = {}) {
  const issue = { id: 'i1', description, descriptionVersion: 3 }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(queryKeys.issue('i1'), issue)
  issuesApi.get.mockResolvedValue(issue)
  issuesApi.update.mockImplementation(async (_slug, _projectId, _id, body) => ({
    ...issue,
    description: body.description,
    descriptionVersion: 4,
  }))
  const tree = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <IssueDescription slug="acme" project={project} issue={issue} />
      </MemoryRouter>
    </QueryClientProvider>
  )
  render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

beforeEach(() => {
  vi.resetAllMocks()
  editor.props = null
  useSessionStore.setState({ status: 'authenticated', user: { id: 'u1' }, accessToken: 'x' })
  checklistApi.list.mockResolvedValue([])
})

describe('«Pasar al checklist» desde la lectura', () => {
  it('si falla una anidada, quita de la descripción la madre ya creada (no queda en ambos lados)', async () => {
    const user = userEvent.setup()
    checklistApi.create.mockResolvedValueOnce({ id: 'n1' }).mockRejectedValueOnce(new Error('falló'))
    renderDescription('- [ ] A\n  - [ ] A1\n- [ ] B')

    await user.click(screen.getByRole('button', { name: 'Pasar «A» al checklist' }))

    await waitFor(() => expect(issuesApi.update).toHaveBeenCalled())
    expect(issuesApi.update).toHaveBeenCalledWith('acme', 'p1', 'i1', {
      description: '- [ ] A1\n- [ ] B',
      baseDescriptionVersion: 3,
    })
    expect(toast.success).toHaveBeenCalledWith('Se pasó 1 paso al checklist')
  })

  it('si una marcada no se pudo marcar en el checklist, se queda en la descripción con su marca', async () => {
    const user = userEvent.setup()
    checklistApi.create.mockResolvedValueOnce({ id: 'n1' })
    checklistApi.update.mockRejectedValueOnce(new Error('falló'))
    checklistApi.remove.mockResolvedValue({})
    renderDescription('- [x] Hecho\n- [ ] B')

    await user.click(screen.getByRole('button', { name: 'Pasar «Hecho» al checklist' }))

    await waitFor(() => expect(checklistApi.remove).toHaveBeenCalledWith('acme', 'p1', 'i1', 'n1'))
    expect(issuesApi.update).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('No se pudo pasar al checklist', expect.anything())
  })
})

describe('Editor de la descripción con StrictMode (desarrollo)', () => {
  it('después de guardar dice «Guardado» y «Listo» cierra el editor', async () => {
    const user = userEvent.setup()
    renderDescription('Hola', { strict: true })

    await user.click(screen.getByRole('button', { name: 'Editar descripción' }))
    await waitFor(() => expect(editor.props).not.toBeNull())
    act(() => editor.props.onChange('Hola mundo'))

    await waitFor(() => expect(issuesApi.update).toHaveBeenCalledTimes(1), { timeout: 3000 })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Guardado'))

    await act(async () => editor.props.onSubmit())
    expect(await screen.findByRole('button', { name: 'Editar descripción' })).toBeInTheDocument()
  })
})
