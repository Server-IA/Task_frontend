import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { ApiError } from '@/lib/errors'
import { cyclesApi } from './api'
import { useAddPlanningIssues } from './hooks'

vi.mock('./api', () => ({ cyclesApi: { addIssues: vi.fn() }, modulesApi: {} }))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useAddPlanningIssues('cycles', 'acme', 'p1'), { wrapper })
  return { queryClient, result }
}

describe('agregar tareas a un ciclo que otra persona cerró', () => {
  it('con 409 vuelve a pedir el ciclo y la lista, para que la página lo muestre cerrado', async () => {
    cyclesApi.addIssues.mockRejectedValue(new ApiError({ status: 409, message: 'El ciclo está cerrado' }))
    const { queryClient, result } = setup()
    queryClient.setQueryData(queryKeys.cycle('c1'), { id: 'c1', status: 'CURRENT' })
    queryClient.setQueryData(queryKeys.cycles('p1'), [{ id: 'c1', status: 'CURRENT' }])
    await act(async () => {
      await result.current.mutateAsync({ id: 'c1', issueIds: ['i1'] }).catch(() => {})
    })
    expect(queryClient.getQueryState(queryKeys.cycle('c1')).isInvalidated).toBe(true)
    expect(queryClient.getQueryState(queryKeys.cycles('p1')).isInvalidated).toBe(true)
  })

  it('otros errores no lo vuelven a pedir', async () => {
    cyclesApi.addIssues.mockRejectedValue(new ApiError({ status: 400, message: 'Datos inválidos' }))
    const { queryClient, result } = setup()
    queryClient.setQueryData(queryKeys.cycle('c1'), { id: 'c1', status: 'CURRENT' })
    await act(async () => {
      await result.current.mutateAsync({ id: 'c1', issueIds: ['i1'] }).catch(() => {})
    })
    expect(queryClient.getQueryState(queryKeys.cycle('c1')).isInvalidated).toBe(false)
  })
})
