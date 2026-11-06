import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { savedViewsApi } from './api'
import { knownFilterIds } from '@/features/issues/unknownFilters'
import { useActiveSavedView, useReorderSavedViews } from './hooks'

vi.mock('./api', () => ({ savedViewsApi: { reorder: vi.fn(), list: vi.fn() } }))

describe('useReorderSavedViews', () => {
  it('conserva los conteos de la lista (la respuesta de PUT /views/order los trae en null)', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const key = queryKeys.savedViews('p1')
    const a = { id: 'a', name: 'A', issueCount: 4 }
    const b = { id: 'b', name: 'B', issueCount: 0 }
    queryClient.setQueryData(key, [a, b])
    savedViewsApi.reorder.mockResolvedValue([
      { id: 'b', name: 'B', issueCount: null },
      { id: 'a', name: 'A', issueCount: null },
    ])
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useReorderSavedViews('acme', 'p1'), { wrapper })

    await act(() => result.current.mutateAsync({ views: [b, a], body: { viewIds: ['b', 'a'] } }))

    expect(queryClient.getQueryData(key)).toEqual([
      { id: 'b', name: 'B', issueCount: 0 },
      { id: 'a', name: 'A', issueCount: 4 },
    ])
  })
})

describe('useActiveSavedView con una etiqueta borrada', () => {
  it('no marca la vista como cambiada y dice qué filtro quedó vacío', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const saved = { id: 'v1', name: 'Diseño', filters: { label: ['borrada'], state: [], priority: [], assignee: [], view: 'list' } }
    savedViewsApi.list.mockResolvedValue([saved])
    const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    // En la URL ya no está la etiqueta (la quitó IssuesPage)
    const issueFilters = {
      activeViewId: 'v1',
      view: 'list',
      sort: undefined,
      filters: { state: [], priority: [], assignee: [], label: [], type: [], search: '' },
    }
    const known = knownFilterIds({ labels: [{ id: 'l1' }] })
    const { result } = renderHook(() => useActiveSavedView('acme', 'p1', issueFilters, known), { wrapper })

    await waitFor(() => expect(result.current.active?.id).toBe('v1'))
    expect(result.current.changed).toEqual([])
    expect(result.current.missing).toEqual(['label'])
  })
})
