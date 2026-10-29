import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { ApiError } from '@/lib/errors'
import { issuesApi } from './api'
import { issueChangeFilters, useDeleteIssue, useIssue, useMoveIssue, useSaveDescription, useSubIssues, useUpdateIssue } from './hooks'
import { useIssueUpdater } from './useIssueHelpers'

vi.mock('./api', () => ({
  issuesApi: { update: vi.fn(), move: vi.fn(), get: vi.fn(), subIssues: vi.fn(), remove: vi.fn() },
}))

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { queryClient, wrapper }
}

const keysOf = (filters) => filters.map((filter) => JSON.stringify(filter.queryKey))

describe('issueChangeFilters', () => {
  it('sin campos (mover, crear, borrar) recarga todo, también ciclos, proyecto y tareas', () => {
    const keys = keysOf(issueChangeFilters('p1', 'i1'))
    expect(keys).toEqual(
      expect.arrayContaining(['["cycles","p1"]', '["modules","p1"]', '["project"]', '["projects"]', '["issue"]', '["stats","p1"]']),
    )
  })

  it('un cambio de estado o de tipo también recarga todo', () => {
    expect(keysOf(issueChangeFilters('p1', 'i1', ['stateId']))).toContain('["cycles","p1"]')
    expect(keysOf(issueChangeFilters('p1', 'i1', ['type']))).toContain('["project"]')
    expect(keysOf(issueChangeFilters('p1', 'i1', ['priority', 'parentId']))).toContain('["project"]')
  })

  it('la prioridad no recarga ciclos, proyecto, subtareas ni las demás tareas', () => {
    const keys = keysOf(issueChangeFilters('p1', 'i1', ['priority']))
    expect(keys).toEqual(expect.arrayContaining(['["issues","p1"]', '["savedViews","p1"]', '["activity","i1"]', '["myWork"]']))
    for (const key of ['["cycles","p1"]', '["project"]', '["issue"]', '["subIssues"]', '["taskRef"]']) expect(keys).not.toContain(key)
  })

  it('el título recarga las pastillas y las tareas que lo muestran, pero no la que ya llegó en la respuesta', () => {
    const filters = issueChangeFilters('p1', 'i1', ['title'])
    expect(keysOf(filters)).toEqual(expect.arrayContaining(['["taskRef"]', '["subIssues"]', '["relations"]']))
    const others = filters.find((filter) => filter.queryKey[0] === 'issue')
    expect(others.predicate({ queryKey: ['issue', 'i1'] })).toBe(false)
    expect(others.predicate({ queryKey: ['issue', 'padre'] })).toBe(true)
  })

  it('la fecha límite recarga los conteos del proyecto (vencidas)', () => {
    expect(keysOf(issueChangeFilters('p1', 'i1', ['clearDueDate']))).toContain('["project"]')
  })
})

describe('useDeleteIssue', () => {
  beforeEach(() => vi.resetAllMocks())

  /** La página (o el panel) de la tarea i1, hija de «padre», con el botón de borrar. */
  function renderIssuePage(queryClient, wrapper) {
    queryClient.setQueryData(queryKeys.issue('i1'), { id: 'i1', parentId: 'padre' })
    queryClient.setQueryData(queryKeys.subIssues('i1'), [])
    queryClient.setQueryData(queryKeys.relations('i1'), [])
    queryClient.setQueryData(queryKeys.checklist('i1'), [])
    queryClient.setQueryData(queryKeys.comments('i1'), [])
    queryClient.setQueryData(queryKeys.activity('i1'), [])
    queryClient.setQueryData(queryKeys.issue('padre'), { id: 'padre' })
    queryClient.setQueryData(queryKeys.subIssues('padre'), [{ id: 'i1' }])
    issuesApi.remove.mockResolvedValue({})
    issuesApi.get.mockResolvedValue({ id: 'padre' })
    issuesApi.subIssues.mockResolvedValue([])
    return renderHook(
      () => ({
        issue: useIssue('acme', 'p1', 'i1'),
        subIssues: useSubIssues('acme', 'p1', 'i1'),
        parent: useIssue('acme', 'p1', 'padre'),
        siblings: useSubIssues('acme', 'p1', 'padre'),
        remove: useDeleteIssue('acme', 'p1'),
      }),
      { wrapper },
    )
  }

  it('no vuelve a pedir la tarea borrada mientras la página se va (serían 404) y la olvida al irse', async () => {
    const { queryClient, wrapper } = setup()
    const { result, rerender, unmount } = renderIssuePage(queryClient, wrapper)

    await act(() => result.current.remove.mutateAsync('i1'))
    // La página vieja se vuelve a dibujar antes de navegar
    rerender()
    rerender()

    // Lo demás sí se recarga: la tarea padre y sus subtareas
    await waitFor(() => expect(issuesApi.subIssues).toHaveBeenCalledWith('acme', 'p1', 'padre'))
    expect(issuesApi.get).toHaveBeenCalledWith('acme', 'p1', 'padre')
    expect(issuesApi.get).not.toHaveBeenCalledWith('acme', 'p1', 'i1')
    expect(issuesApi.subIssues).not.toHaveBeenCalledWith('acme', 'p1', 'i1')

    unmount()
    const cache = queryClient.getQueryCache()
    for (const key of ['issue', 'subIssues', 'relations', 'checklist', 'comments', 'activity']) {
      expect(cache.find({ queryKey: [key, 'i1'] })).toBeUndefined()
    }
    expect(issuesApi.get).not.toHaveBeenCalledWith('acme', 'p1', 'i1')
    // Lo de las demás tareas sigue en el caché
    expect(queryClient.getQueryData(queryKeys.issue('padre'))).toEqual({ id: 'padre' })
  })

  it('lo que nadie mira de la tarea borrada se borra enseguida', async () => {
    const { queryClient, wrapper } = setup()
    const { result } = renderIssuePage(queryClient, wrapper)

    await act(() => result.current.remove.mutateAsync('i1'))

    // Nadie mira sus relaciones, pasos, comentarios ni actividad en este render
    const cache = queryClient.getQueryCache()
    for (const key of ['relations', 'checklist', 'comments', 'activity']) {
      expect(cache.find({ queryKey: [key, 'i1'] })).toBeUndefined()
    }
    // La tarea y sus subtareas siguen mientras la página las muestra
    expect(queryClient.getQueryData(queryKeys.issue('i1'))).toEqual({ id: 'i1', parentId: 'padre' })
  })
})

describe('useUpdateIssue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('las ediciones de una misma tarea van en fila: la segunda sale cuando vuelve la primera', async () => {
    const { wrapper } = setup()
    const first = deferred()
    issuesApi.update.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ id: 'i1', labels: [] })
    const { result } = renderHook(() => useUpdateIssue('acme', 'p1', 'i1'), { wrapper })

    act(() => {
      result.current.mutate({ issueId: 'i1', labelIds: ['bug'] })
      result.current.mutate({ issueId: 'i1', labelIds: ['bug', 'frontend'] })
    })
    await waitFor(() => expect(issuesApi.update).toHaveBeenCalledTimes(1))
    expect(issuesApi.update).toHaveBeenLastCalledWith('acme', 'p1', 'i1', { labelIds: ['bug'] })

    first.resolve({ id: 'i1', labels: [] })
    await waitFor(() => expect(issuesApi.update).toHaveBeenCalledTimes(2))
    expect(issuesApi.update).toHaveBeenLastCalledWith('acme', 'p1', 'i1', { labelIds: ['bug', 'frontend'] })
  })
})

describe('useIssueUpdater', () => {
  beforeEach(() => vi.clearAllMocks())

  it('dos cambios seguidos de la misma tarea: si el primero falla, su onError se llama igual', async () => {
    const { wrapper } = setup()
    const first = deferred()
    issuesApi.update.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ id: 'i1' })
    const firstError = vi.fn()
    const { result } = renderHook(() => useIssueUpdater('acme', 'p1', 'i1'), { wrapper })

    act(() => {
      result.current.update({ stateId: 's-todo' }, { onError: firstError })
      result.current.update({ priority: 'HIGH' })
    })
    const closed = new ApiError({ status: 409, message: 'WEB-1 está cerrada', code: 'STORY_CLOSED' })
    first.reject(closed)
    await waitFor(() => expect(firstError).toHaveBeenCalledWith(closed))
    await waitFor(() => expect(issuesApi.update).toHaveBeenCalledTimes(2))
    expect(issuesApi.update).toHaveBeenNthCalledWith(1, 'acme', 'p1', 'i1', { stateId: 's-todo' })
    expect(issuesApi.update).toHaveBeenNthCalledWith(2, 'acme', 'p1', 'i1', { priority: 'HIGH' })
  })
})

describe('useMoveIssue', () => {
  beforeEach(() => vi.clearAllMocks())

  const todo = { id: 's-todo', group: 'UNSTARTED' }
  const done = { id: 's-done', group: 'COMPLETED' }
  const page = { content: [{ id: 'i1', state: done, sortOrder: 1 }] }
  const listKey = queryKeys.issues('p1', { sort: 'sortOrder,asc' })

  it('si el backend rechaza (historia cerrada), la tarjeta vuelve a su columna', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(listKey, page)
    const request = deferred()
    issuesApi.move.mockReturnValueOnce(request.promise)
    const { result } = renderHook(() => useMoveIssue('acme', 'p1'), { wrapper })

    act(() => result.current.mutate({ issueId: 'i1', stateId: todo.id, state: todo, sortOrder: 5 }))
    await waitFor(() => expect(queryClient.getQueryData(listKey).content[0].state).toEqual(todo))

    request.reject(new ApiError({ status: 409, message: 'WEB-1 está cerrada', code: 'STORY_CLOSED' }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(listKey).content[0].state).toEqual(done)
  })

  it('dos arrastres seguidos: el rechazo del primero llama a su onError y no deshace el segundo', async () => {
    const { queryClient, wrapper } = setup()
    const two = { content: [{ id: 'i1', state: done, sortOrder: 1 }, { id: 'i2', state: done, sortOrder: 2 }] }
    queryClient.setQueryData(listKey, two)
    const first = deferred()
    const second = deferred()
    issuesApi.move.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const firstError = vi.fn()
    const secondError = vi.fn()
    const { result } = renderHook(() => useMoveIssue('acme', 'p1'), { wrapper })

    act(() => result.current.mutate({ issueId: 'i1', stateId: todo.id, state: todo, sortOrder: 5, onError: firstError }))
    await waitFor(() => expect(issuesApi.move).toHaveBeenCalledTimes(1))
    act(() => result.current.mutate({ issueId: 'i2', stateId: todo.id, state: todo, sortOrder: 6, onError: secondError }))
    await waitFor(() => expect(queryClient.getQueryData(listKey).content[1].state).toEqual(todo))

    const closed = new ApiError({ status: 409, message: 'WEB-1 está cerrada', code: 'STORY_CLOSED' })
    first.reject(closed)
    await waitFor(() => expect(firstError).toHaveBeenCalledWith(closed))
    const [i1, i2] = queryClient.getQueryData(listKey).content
    expect(i1).toMatchObject({ state: done, sortOrder: 1 })
    expect(i2).toMatchObject({ state: todo, sortOrder: 6 })
    expect(secondError).not.toHaveBeenCalled()
    // El onError no se manda al backend
    expect(issuesApi.move.mock.calls[0][3]).not.toHaveProperty('onError')
  })

  it('reintentar con reopenParent lo manda al backend', async () => {
    const { wrapper } = setup()
    issuesApi.move.mockResolvedValueOnce({ id: 'i1' })
    const { result } = renderHook(() => useMoveIssue('acme', 'p1'), { wrapper })

    act(() => result.current.mutate({ issueId: 'i1', stateId: todo.id, afterIssueId: null, beforeIssueId: 'i2', reopenParent: true }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(issuesApi.move).toHaveBeenCalledWith('acme', 'p1', 'i1', {
      stateId: todo.id,
      afterIssueId: null,
      beforeIssueId: 'i2',
      reopenParent: true,
    })
  })
})

describe('useSaveDescription', () => {
  beforeEach(() => vi.clearAllMocks())

  it('si el guardado falla (no por conflicto), la caché vuelve a la descripción de antes', async () => {
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(queryKeys.issue('i1'), { id: 'i1', description: '- [ ] uno', descriptionVersion: 3 })
    issuesApi.update.mockRejectedValueOnce(new ApiError({ status: 0, message: 'Sin conexión' }))
    // La recarga posterior tampoco llega (sin red)
    queryClient.setQueryDefaults(queryKeys.issue('i1'), { queryFn: () => Promise.reject(new Error('offline')) })
    const { result } = renderHook(() => useSaveDescription('acme', 'p1', 'i1'), { wrapper })

    act(() => result.current.mutate({ description: '- [x] uno', base: 3 }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(queryKeys.issue('i1')).description).toBe('- [ ] uno')
  })
})
