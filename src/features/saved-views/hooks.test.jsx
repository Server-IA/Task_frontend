import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { savedViewsApi } from './api'
import { useReorderSavedViews } from './hooks'

vi.mock('./api', () => ({ savedViewsApi: { reorder: vi.fn() } }))

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
