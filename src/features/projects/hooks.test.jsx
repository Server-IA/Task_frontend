import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAddPlanningIssues, useUpdatePlanning } from '@/features/planning/hooks'
import { cyclesApi } from '@/features/planning/api'
import { useAddRelation } from '@/features/relations/hooks'
import { relationsApi } from '@/features/relations/api'
import { labelsApi, projectsApi, statesApi } from './api'
import {
  reorderStates,
  useAddProjectMember,
  useDeleteProject,
  useRemoveProjectMember,
  useReorderStates,
  useUpdateLabel,
  useUpdateState,
} from './hooks'

vi.mock('./api', () => ({
  projectsApi: { remove: vi.fn(), addMember: vi.fn(), removeMember: vi.fn() },
  statesApi: { update: vi.fn(), reorder: vi.fn() },
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

describe('miembros del proyecto', () => {
  it('agregar o quitar un miembro refresca los proyectos (las tarjetas del inicio traen los primeros miembros)', async () => {
    const { wrapper, keys } = setup()
    projectsApi.addMember.mockResolvedValue({})
    projectsApi.removeMember.mockResolvedValue({})
    await run(() => useAddProjectMember('acme', 'p1'), 'u2', wrapper)
    await run(() => useRemoveProjectMember('acme', 'p1'), 'u2', wrapper)
    for (const key of ['["projectMembers","p1"]', '["projects","acme"]', '["project","acme","p1"]']) {
      expect(keys().filter((item) => item === key)).toHaveLength(2)
    }
  })
})

describe('reordenar estados', () => {
  const states = [
    { id: 'a', name: 'Backlog', position: 0 },
    { id: 'b', name: 'Doing', position: 1 },
    { id: 'c', name: 'Done', position: 2 },
  ]

  it('reorderStates ordena por la lista y renumera las posiciones', () => {
    expect(reorderStates(states, ['b', 'a', 'c'])).toEqual([
      { id: 'b', name: 'Doing', position: 0 },
      { id: 'a', name: 'Backlog', position: 1 },
      { id: 'c', name: 'Done', position: 2 },
    ])
  })

  it('manda el orden en una sola petición, cambia la lista al instante y recarga una vez', async () => {
    const { queryClient, wrapper, keys } = setup()
    queryClient.setQueryData(['states', 'p1'], states)
    let resolve
    statesApi.reorder.mockReturnValue(new Promise((done) => (resolve = done)))
    const { result } = renderHook(() => useReorderStates('acme', 'p1'), { wrapper })

    act(() => result.current.mutate(['b', 'a', 'c']))
    await waitFor(() => expect(queryClient.getQueryData(['states', 'p1']).map((state) => state.id)).toEqual(['b', 'a', 'c']))
    expect(statesApi.reorder).toHaveBeenCalledWith('acme', 'p1', ['b', 'a', 'c'])

    await act(async () => resolve([]))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(statesApi.reorder).toHaveBeenCalledTimes(1)
    expect(statesApi.update).not.toHaveBeenCalled()
    expect(keys()).toEqual(['["states","p1"]'])
  })

  it('si falla, vuelve al orden anterior y recarga una vez', async () => {
    const { queryClient, wrapper, keys } = setup()
    queryClient.setQueryData(['states', 'p1'], states)
    statesApi.reorder.mockRejectedValue(new Error('400'))
    const result = await run(() => useReorderStates('acme', 'p1'), ['b', 'a', 'c'], wrapper)
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(['states', 'p1'])).toEqual(states)
    expect(keys()).toEqual(['["states","p1"]'])
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
