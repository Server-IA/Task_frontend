import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checklistApi } from './api'
import { toApiError } from '@/lib/errors'
import { CHECKLIST_LIMIT, useMoveToChecklist } from './hooks'

vi.mock('./api', () => ({ checklistApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() } }))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return renderHook(() => useMoveToChecklist('acme', 'p1', 'i1'), { wrapper }).result
}

const steps = (count) => Array.from({ length: count }, (_, index) => ({ text: `Paso ${index + 1}`, checked: false }))
const existing = (count) => Array.from({ length: count }, (_, index) => ({ id: `c${index}` }))

describe('useMoveToChecklist', () => {
  beforeEach(() => vi.clearAllMocks())

  it('si no caben todos, no crea ninguno', async () => {
    checklistApi.list.mockResolvedValue(existing(CHECKLIST_LIMIT - 2))
    const result = setup()
    await act(async () => {
      await expect(result.current.mutateAsync(steps(5))).rejects.toThrow('Solo caben 2 pasos más en el checklist')
    })
    expect(checklistApi.create).not.toHaveBeenCalled()
  })

  it('el aviso de que no caben dice cuántos caben (no «No se pudo conectar con el servidor»)', async () => {
    checklistApi.list.mockResolvedValue(existing(CHECKLIST_LIMIT - 2))
    const result = setup()
    let error
    await act(async () => {
      error = await result.current.mutateAsync(steps(5)).catch((caught) => caught)
    })
    expect(toApiError(error)).toMatchObject({ status: 409, message: 'Solo caben 2 pasos más en el checklist (máximo 100)' })
  })

  it('si un paso marcado no se puede marcar, no cuenta como pasado y se quita del checklist', async () => {
    checklistApi.list.mockResolvedValue([])
    const failure = new Error('500')
    checklistApi.create.mockResolvedValueOnce({ id: 'n1' }).mockResolvedValueOnce({ id: 'n2' })
    checklistApi.update.mockRejectedValueOnce(failure)
    checklistApi.remove.mockResolvedValue({})
    const result = setup()
    let outcome
    await act(async () => {
      outcome = await result.current.mutateAsync([
        { text: 'Pendiente', checked: false },
        { text: 'Hecho', checked: true },
        { text: 'Otro', checked: false },
      ])
    })
    // Solo el primero quedó completo: «Hecho» se queda en la descripción con su marca, y no queda repetido
    expect(outcome).toEqual({ created: 1, error: failure })
    expect(checklistApi.remove).toHaveBeenCalledWith('acme', 'p1', 'i1', 'n2')
    expect(checklistApi.create).toHaveBeenCalledTimes(2)
  })

  it('si uno falla a mitad de camino, dice cuántos se crearon y no intenta los siguientes', async () => {
    checklistApi.list.mockResolvedValue([])
    const failure = new Error('409')
    checklistApi.create
      .mockResolvedValueOnce({ id: 'n1' })
      .mockResolvedValueOnce({ id: 'n2' })
      .mockRejectedValueOnce(failure)
    const result = setup()
    let outcome
    await act(async () => {
      outcome = await result.current.mutateAsync(steps(5))
    })
    expect(outcome).toEqual({ created: 2, error: failure })
    expect(checklistApi.create).toHaveBeenCalledTimes(3)
  })

  it('todo bien: las marcadas quedan hechas', async () => {
    checklistApi.list.mockResolvedValue([])
    checklistApi.create.mockResolvedValueOnce({ id: 'n1' }).mockResolvedValueOnce({ id: 'n2' })
    checklistApi.update.mockResolvedValue({})
    const result = setup()
    let outcome
    await act(async () => {
      outcome = await result.current.mutateAsync([
        { text: 'Hecho', checked: true },
        { text: 'Pendiente', checked: false },
      ])
    })
    expect(outcome).toEqual({ created: 2, error: null })
    expect(checklistApi.update).toHaveBeenCalledWith('acme', 'p1', 'i1', 'n1', { done: true })
  })
})
