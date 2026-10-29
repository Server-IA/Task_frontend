import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAddPlanningIssues, useUpdatePlanning } from '@/features/planning/hooks'
import { cyclesApi } from '@/features/planning/api'
import { useAddRelation } from '@/features/relations/hooks'
import { relationsApi } from '@/features/relations/api'
import { labelsApi, projectsApi, statesApi } from './api'
import { useDeleteProject, useSwapStatePositions, useUpdateLabel, useUpdateState } from './hooks'

vi.mock('./api', () => ({
  projectsApi: { remove: vi.fn() },
  statesApi: { update: vi.fn() },
  labelsApi: { update: vi.fn() },
}))
vi.mock('@/features/planning/api', () => ({
  cyclesApi: { update: vi.fn(), addIssues: vi.fn() },
  modulesApi: {},
}))
vi.mock('@/features/relations/api', () => ({ relationsApi: { create: vi.fn() } }))

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidated = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  /** Claves invalidadas (como texto, para compararlas). */
  const keys = () => invalidated.mock.calls.map(([filter]) => JSON.stringify(filter.queryKey))
  return { queryClient, wrapper, keys }
}

async function run(hook, variables, wrapper) {
  const { result } = renderHook(hook, { wrapper })
  await act(() => result.current.mutateAsync(variables).catch(() => {}))
  return result
}

beforeEach(() => vi.clearAllMocks())

describe('al eliminar un proyecto', () => {
  it('se refrescan Mi trabajo, la actividad, la búsqueda y la Bandeja', async () => {
    const { wrapper, keys } = setup()
    projectsApi.remove.mockResolvedValue({})
    await run(() => useDeleteProject('acme', 'p1'), undefined, wrapper)
    expect(keys()).toEqual(
      expect.arrayContaining(['["projects","acme"]', '["myWork","acme"]', '["workspaceActivity","acme"]', '["search","acme"]', '["notifications"]']),
    )
  })
})

describe('al renombrar un estado o una etiqueta', () => {
  it('se refrescan el detalle de las tareas, las historias y Mi trabajo', async () => {
    const { wrapper, keys } = setup()
    statesApi.update.mockResolvedValue({})
    labelsApi.update.mockResolvedValue({})
    await run(() => useUpdateState('acme', 'p1'), { stateId: 's1', name: 'Doing' }, wrapper)
    await run(() => useUpdateLabel('acme', 'p1'), { labelId: 'l1', name: 'ui' }, wrapper)
    for (const key of ['["issue"]', '["stories","p1"]', '["myWork","acme"]', '["issues","p1"]']) {
      expect(keys().filter((item) => item === key)).toHaveLength(2)
    }
  })
})

describe('reordenar estados', () => {
  it('si falla el segundo cambio, deshace el primero (no queda el orden a medias) y recarga una vez', async () => {
    const { wrapper, keys } = setup()
    statesApi.update.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce({})
    const result = await run(
      () => useSwapStatePositions('acme', 'p1'),
      { first: { id: 'a', from: 0, to: 1 }, second: { id: 'b', from: 1, to: 0 } },
      wrapper,
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(statesApi.update.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ['a', { position: 1 }],
      ['b', { position: 0 }],
      ['a', { position: 0 }],
    ])
    expect(keys()).toEqual(['["states","p1"]'])
  })

  it('van una tras otra, no en paralelo', async () => {
    const { wrapper } = setup()
    let resolveFirst
    statesApi.update.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve))).mockResolvedValueOnce({})
    const { result } = renderHook(() => useSwapStatePositions('acme', 'p1'), { wrapper })
    act(() => result.current.mutate({ first: { id: 'a', from: 0, to: 1 }, second: { id: 'b', from: 1, to: 0 } }))
    await waitFor(() => expect(statesApi.update).toHaveBeenCalledTimes(1))
    resolveFirst({})
    await waitFor(() => expect(statesApi.update).toHaveBeenCalledTimes(2))
  })
})

describe('ciclos y módulos', () => {
  it('cambiar las fechas refresca las estadísticas (burndown)', async () => {
    const { wrapper, keys } = setup()
    cyclesApi.update.mockResolvedValue({ id: 'c1' })
    await run(() => useUpdatePlanning('cycles', 'acme', 'p1'), { id: 'c1', startDate: '2026-11-02' }, wrapper)
    expect(keys()).toContain('["stats","p1"]')
  })

  it('agregar tareas refresca los demás ciclos (las saca del anterior) y las historias', async () => {
    const { queryClient, wrapper } = setup()
    cyclesApi.addIssues.mockResolvedValue({ id: 'c2' })
    queryClient.setQueryData(['cycle', 'c1'], { id: 'c1' })
    queryClient.setQueryData(['cycle', 'c2'], { id: 'c2' })
    queryClient.setQueryData(['stories', 'p1'], [])
    await run(() => useAddPlanningIssues('cycles', 'acme', 'p1'), { id: 'c2', issueIds: ['i1'] }, wrapper)
    expect(queryClient.getQueryState(['cycle', 'c1']).isInvalidated).toBe(true)
    // El ciclo destino ya llegó en la respuesta
    expect(queryClient.getQueryState(['cycle', 'c2']).isInvalidated).toBe(false)
    expect(queryClient.getQueryState(['stories', 'p1']).isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['stats', 'p1'])).toBeUndefined()
  })
})

describe('relaciones', () => {
  it('refrescan las historias de los dos proyectos', async () => {
    const { wrapper, keys } = setup()
    relationsApi.create.mockResolvedValue({})
    await run(() => useAddRelation('acme', 'p1', 'i1'), { type: 'RELATES', otherId: 'i9', otherProjectId: 'p2' }, wrapper)
    expect(keys()).toEqual(expect.arrayContaining(['["stories","p1"]', '["stories","p2"]']))
  })
})
