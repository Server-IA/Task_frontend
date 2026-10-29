import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { notificationsApi } from './api'
import { useMarkAsRead, useNotifications } from './hooks'

vi.mock('./api', () => ({ notificationsApi: { list: vi.fn(), counts: vi.fn(), markAsRead: vi.fn() } }))

const notification = (id, read = false) => ({ id, read })
const page = (number, ids, last = false) => ({ page: number, last, content: ids.map((id) => notification(id)) })

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

  it('en «No leídas», después de abrir uno, «Cargar más» vuelve a pedir desde la página 0 y no se salta avisos', async () => {
    // Servidor: 4 sin leer, de a 2 por página
    notificationsApi.list.mockResolvedValueOnce(page(0, ['a', 'b']))
    const { result } = setup()
    await waitFor(() => expect(result.current.list.notifications).toHaveLength(2))

    await act(() => result.current.markAsRead.mutateAsync('a'))
    // Se marca leído en la lista sin recargarla (sigue a la vista mientras se lee)
    await waitFor(() => expect(result.current.list.notifications[0]).toEqual({ id: 'a', read: true }))
    // Ya leído, el servidor corre todo un lugar: la página 0 es [b, c] y la 1, [d]
    notificationsApi.list.mockResolvedValueOnce(page(0, ['b', 'c'])).mockResolvedValueOnce(page(1, ['d'], true))
    await act(() => result.current.list.loadMore())

    expect(notificationsApi.list.mock.calls.map(([params]) => params.page)).toEqual([0, 0, 1])
    await waitFor(() => expect(result.current.list.notifications.map((item) => item.id)).toEqual(['b', 'c', 'd']))
  })

  it('no repite un aviso que llega en dos páginas', async () => {
    notificationsApi.list.mockResolvedValueOnce(page(0, ['a', 'b'])).mockResolvedValueOnce(page(1, ['b', 'c'], true))
    const { result } = setup()
    await waitFor(() => expect(result.current.list.notifications).toHaveLength(2))
    await act(() => result.current.list.loadMore())
    await waitFor(() => expect(result.current.list.notifications.map((item) => item.id)).toEqual(['a', 'b', 'c']))
  })

  it('no se consulta sola cada 30 s: se recarga cuando sube el contador de sin leer', async () => {
    notificationsApi.list.mockResolvedValue(page(0, ['a'], true))
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
