import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLIENT_ID } from '@/api/clientId'

let handlers
vi.mock('@/api/realtime', () => ({
  startRealtime: (given) => {
    handlers = given
    return () => {}
  },
}))

// El setup global lo reemplaza por un componente vacío (las demás pruebas no tienen servidor): aquí va el de verdad
const { RealtimeSync, GATHER_MS } = await vi.importActual('./RealtimeSync')

const P = '0d405a1e-8e17-4d02-ae3a-23c8f3df6ab9'

function setup() {
  const queryClient = new QueryClient()
  const spy = vi.spyOn(queryClient, 'invalidateQueries')
  render(
    <QueryClientProvider client={queryClient}>
      <RealtimeSync />
    </QueryClientProvider>,
  )
  return { queryClient, spy }
}

describe('RealtimeSync', () => {
  afterEach(() => vi.useRealTimers())

  it('junta los avisos que llegan seguidos y refresca una sola vez', async () => {
    vi.useFakeTimers()
    const { spy } = setup()
    act(() => {
      handlers.onEvent({ event: 'change', data: { workspace: 'equipo', projectId: P } })
      handlers.onEvent({ event: 'change', data: { workspace: 'equipo', projectId: P, issueId: 'x' } })
      handlers.onEvent({ event: 'notifications', data: {} })
    })
    expect(spy).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(GATHER_MS))
    expect(spy).toHaveBeenCalledTimes(1)
    const { predicate } = spy.mock.calls[0][0]
    expect(predicate({ queryKey: ['issues', P, {}] })).toBe(true)
    expect(predicate({ queryKey: ['notifications', 'counts'] })).toBe(true)
    expect(predicate({ queryKey: ['me'] })).toBe(false)
  })

  it('lo que hizo esta misma pestaña no se vuelve a pedir', async () => {
    vi.useFakeTimers()
    const { spy } = setup()
    act(() =>
      handlers.onEvent({ event: 'change', data: { workspace: 'equipo', projectId: P, origin: CLIENT_ID } }),
    )
    await act(() => vi.advanceTimersByTimeAsync(GATHER_MS * 2))
    expect(spy).not.toHaveBeenCalled()
  })

  it('mientras la pestaña guarda algo, lo de otros espera a que termine', async () => {
    vi.useFakeTimers()
    const { queryClient, spy } = setup()
    const saving = vi.spyOn(queryClient, 'isMutating').mockReturnValue(1)
    act(() => handlers.onEvent({ event: 'change', data: { workspace: 'equipo', projectId: P } }))
    await act(() => vi.advanceTimersByTimeAsync(GATHER_MS + 100))
    expect(spy).not.toHaveBeenCalled()
    saving.mockReturnValue(0)
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
