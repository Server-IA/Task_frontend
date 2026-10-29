import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { notificationsApi } from './api'
import { useMarkAsRead, useNotifications } from './hooks'

vi.mock('./api', () => ({ notificationsApi: { list: vi.fn(), counts: vi.fn(), markAsRead: vi.fn() } }))

const notification = (id, read = false) => ({ id, read })
/** Página con cursor: `next` es el nextCursor (null en la última). */
const page = (ids, next = null) => ({ content: ids.map((id) => notification(id)), nextCursor: next, totalElements: -1 })

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const { result } = renderHook(() => ({ list: useNotifications({ tab: 'unread' }), markAsRead: useMarkAsRead() }), { wrapper })
  return { queryClient, result }
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    notificationsApi.counts.mockResolvedValue({ unread: 4, mentionsUnread: 0, mentions: 0 })
    notificationsApi.markAsRead.mockResolvedValue({})
  })

  it('«Cargar más» pide la página siguiente con el nextCursor de la anterior', async () => {
    notificationsApi.list.mockResolvedValueOnce(page(['a', 'b'], '2026-10-29T10:00:00Z,b'))
    const { result } = setup()
    await waitFor(() => expect(result.current.list.notifications).toHaveLength(2))
    expect(result.current.list.hasNextPage).toBe(true)

    notificationsApi.list.mockResolvedValueOnce(page(['c']))
    await act(() => result.current.list.fetchNextPage())

    expect(notificationsApi.list.mock.calls.map(([params]) => params.before)).toEqual([undefined, '2026-10-29T10:00:00Z,b'])
    expect(notificationsApi.list.mock.calls[1][0]).toMatchObject({ unread: true, size: 20 })
    await waitFor(() => expect(result.current.list.notifications.map((item) => item.id)).toEqual(['a', 'b', 'c']))
    expect(result.current.list.hasNextPage).toBe(false)
  })

  it('en «No leídas», abrir uno no recarga nada antes de «Cargar más» (el cursor no se corre)', async () => {
    notificationsApi.list.mockResolvedValueOnce(page(['a', 'b'], '2026-10-29T10:00:00Z,b'))
    const { result } = setup()
    await waitFor(() => expect(result.current.list.notifications).toHaveLength(2))

    await act(() => result.current.markAsRead.mutateAsync('a'))
    // Se marca leído en la lista sin recargarla (sigue a la vista mientras se lee)
    await waitFor(() => expect(result.current.list.notifications[0]).toEqual({ id: 'a', read: true }))
    notificationsApi.list.mockResolvedValueOnce(page(['c', 'd']))
    await act(() => result.current.list.fetchNextPage())

    expect(notificationsApi.list).toHaveBeenCalledTimes(2)
    expect(notificationsApi.list.mock.calls[1][0].before).toBe('2026-10-29T10:00:00Z,b')
    await waitFor(() => expect(result.current.list.notifications.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']))
  })

  it('no repite un aviso que llega en dos páginas', async () => {
    notificationsApi.list.mockResolvedValueOnce(page(['a', 'b'], 'cursor-b')).mockResolvedValueOnce(page(['b', 'c']))
    const { result } = setup()
    await waitFor(() => expect(result.current.list.notifications).toHaveLength(2))
    await act(() => result.current.list.fetchNextPage())
    await waitFor(() => expect(result.current.list.notifications.map((item) => item.id)).toEqual(['a', 'b', 'c']))
  })

  it('no se consulta sola cada 30 s: se recarga cuando sube el contador de sin leer', async () => {
    notificationsApi.list.mockResolvedValue(page(['a']))
    const { queryClient, result } = setup()
    await waitFor(() => expect(result.current.list.notifications).toHaveLength(1))
    await waitFor(() => expect(queryClient.getQueryData(queryKeys.notificationCounts)).toBeTruthy())
    expect(notificationsApi.list).toHaveBeenCalledTimes(1)

    // Bajar (se leyó uno) no recarga la lista
    act(() => queryClient.setQueryData(queryKeys.notificationCounts, { unread: 3 }))
    expect(notificationsApi.list).toHaveBeenCalledTimes(1)
    // Subir (llegó uno) sí
    act(() => queryClient.setQueryData(queryKeys.notificationCounts, { unread: 5 }))
    await waitFor(() => expect(notificationsApi.list).toHaveBeenCalledTimes(2))
  })
})
