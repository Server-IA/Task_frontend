import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { checklistApi } from '../api'
import { IssueChecklist } from './IssueChecklist'

// Quien mira tiene todos los permisos (project manager)
vi.mock('@/features/workspaces/hooks', () => ({ useWorkspace: () => ({ data: { myRole: 'OWNER' } }) }))
vi.mock('../api', () => ({ checklistApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))

beforeAll(() => {
  // El selector (Segmented) mide su pastilla con ResizeObserver, que jsdom no trae
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function renderChecklist() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <IssueChecklist slug="acme" projectId="p1" issue={{ id: 'i1' }} />
    </QueryClientProvider>,
  )
}

describe('IssueChecklist: criterios de aceptación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checklistApi.list.mockResolvedValue([])
    usePreferencesStore.getState().setCriteriaFormat('gherkin')
  })

  it('sin criterios, elegir «Lista simple» deja el campo abierto (no se cerraba todo)', async () => {
    renderChecklist()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '+ criterio' }))
    expect(screen.getByRole('group', { name: 'Nuevo criterio de aceptación' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lista simple' }))

    const input = await screen.findByPlaceholderText('Qué debe cumplirse')
    expect(input).toHaveFocus()
    await user.type(input, 'El correo llega en menos de un minuto{Enter}')
    expect(checklistApi.create).toHaveBeenCalledWith('acme', 'p1', 'i1', {
      kind: 'CRITERION',
      text: 'El correo llega en menos de un minuto',
    })
  })

  it('y volver a «Dado / cuando / entonces» también deja el formulario abierto', async () => {
    usePreferencesStore.getState().setCriteriaFormat('plain')
    renderChecklist()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: '+ criterio' }))
    await user.click(screen.getByRole('button', { name: 'Dado / cuando / entonces' }))
    expect(screen.getByRole('group', { name: 'Nuevo criterio de aceptación' })).toBeInTheDocument()
  })
})

describe('IssueChecklist: reordenar con el teclado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePreferencesStore.getState().setCriteriaFormat('plain')
    checklistApi.list.mockResolvedValue([
      { id: '2f1c0b8e-0000-4000-8000-000000000001', kind: 'CRITERION', text: 'El correo llega', done: false, position: 0 },
      { id: '2f1c0b8e-0000-4000-8000-000000000002', kind: 'CRITERION', text: 'El enlace vence', done: false, position: 1 },
    ])
  })

  it('el asa se presenta en español («elemento arrastrable»), no como «sortable»', async () => {
    renderChecklist()
    const handle = await screen.findByRole('button', { name: 'Mover «El correo llega»' })
    expect(handle).toHaveAttribute('aria-roledescription', 'elemento arrastrable')
  })

  it('el lector de pantalla oye el texto del criterio en español, no su id', async () => {
    renderChecklist()
    const handle = await screen.findByRole('button', { name: 'Mover «El correo llega»' })
    handle.focus()
    fireEvent.keyDown(handle, { key: ' ', code: 'Space' })
    // Al levantarlo, dnd-kit anuncia enseguida dónde está (reemplaza a «Levantaste…»)
    expect(await screen.findByText('el criterio «El correo llega» está en la posición 1 de 2.')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/2f1c0b8e|Picked up/)
    expect(screen.getAllByText(/pulsa Espacio/).length).toBeGreaterThan(0)
  })
})
