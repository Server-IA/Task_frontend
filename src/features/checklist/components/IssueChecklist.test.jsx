import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { checklistApi } from '../api'
import { IssueChecklist } from './IssueChecklist'

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
