import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/stores/sessionStore'
import { commentsApi } from './api'
import { IssueActivity } from './IssueActivity'

vi.mock('./api', () => ({ commentsApi: { list: vi.fn(), remove: vi.fn(), create: vi.fn(), update: vi.fn() } }))
vi.mock('@/features/issues/hooks', () => ({ useActivity: () => ({ data: [], isLoading: false }) }))
vi.mock('@/features/mentions/hooks', () => ({ useMentionPeople: () => [] }))
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspace: () => ({ data: { myRole: 'OWNER' } }) }))
vi.mock('@/features/editor/components/MarkdownView', () => ({ MarkdownView: ({ markdown }) => <p>{markdown}</p> }))
vi.mock('@/features/editor/components/LazyRichEditor', () => ({
  // Como el editor real: al enfocar la caja aparece el editor y toma el foco (autoFocus)
  LazyRichEditor: ({ ariaLabel, autoFocus }) => (
    <div role="textbox" tabIndex={0} aria-label={ariaLabel} ref={(element) => autoFocus && element?.focus()} />
  ),
  preloadRichEditor: () => {},
}))
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

const valentina = { id: 'u1', fullName: 'Valentina Ríos' }
const comment = { id: 'c1', body: 'Comentario lento', author: valentina, createdAt: '2026-11-05T10:00:00Z', updatedAt: '2026-11-05T10:00:00Z' }

describe('IssueActivity: eliminar un comentario con el teclado', () => {
  it('el foco pasa a la caja para comentar (la tarjeta desaparece con el foco adentro)', async () => {
    useSessionStore.setState({ status: 'authenticated', user: valentina, accessToken: 'x' })
    let comments = [comment]
    commentsApi.list.mockImplementation(async () => comments)
    commentsApi.remove.mockImplementation(async () => {
      comments = []
    })
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <IssueActivity slug="equipo" projectId="p1" issueId="i1" issueCode="PORT-35" projectIdentifier="PORT" />
      </QueryClientProvider>,
    )

    const actions = await screen.findByRole('button', { name: 'Acciones del comentario' })
    actions.focus()
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('menuitem', { name: 'Eliminar' }))
    await user.click(await screen.findByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(screen.queryByText('Comentario lento')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Escribe un comentario' })).toHaveFocus())
  })
})
