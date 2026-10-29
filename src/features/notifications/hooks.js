import { useCallback, useEffect, useRef } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { flattenUniquePages } from '@/lib/pagination'
import { notificationsApi } from './api'
import { INBOX_TABS, markReadInPages } from './notificationParts'

const PAGE_SIZE = 20

/**
 * Contadores de la Bandeja (sin leer, menciones sin leer, menciones): se consultan cada 30 s mientras la pestaña
 * está visible. El badge de la barra lateral y las pestañas leen la misma consulta, así siempre coinciden.
 */
const countsQuery = {
  queryKey: queryKeys.notificationCounts,
  queryFn: notificationsApi.counts,
  refetchInterval: 30_000,
  refetchIntervalInBackground: false,
}

export function useNotificationCounts() {
  return useQuery(countsQuery)
}

/** Sin leer (badge de la barra lateral). */
export function useUnreadCount() {
  return useQuery({ ...countsQuery, select: (counts) => counts.unread })
}

/**
 * Avisos de una pestaña por páginas («Cargar más»), sin repetidos.
 * - No se consultan cada 30 s (eso recargaría todas las páginas cargadas): se recargan cuando el contador de
 *   sin leer sube, es decir, cuando llegó algo.
 * - En «No leídas», abrir un aviso lo marca leído solo en caché y el servidor ya no lo cuenta en sus páginas:
 *   `loadMore` vuelve a pedir las páginas cargadas antes de la siguiente para no saltarse avisos.
 * @param {{ tab: keyof typeof INBOX_TABS }} options
 */
export function useNotifications({ tab }) {
  const filter = INBOX_TABS[tab] ?? INBOX_TABS.unread
  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications({ tab }),
    queryFn: ({ pageParam }) => notificationsApi.list({ ...filter, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  })
  const { data, refetch, fetchNextPage } = query

  const { data: unread } = useUnreadCount()
  const previousUnread = useRef(unread)
  useEffect(() => {
    if (unread != null && previousUnread.current != null && unread > previousUnread.current) refetch()
    previousUnread.current = unread
  }, [unread, refetch])

  const onlyUnread = Boolean(filter.unread)
  const loadMore = useCallback(async () => {
    const readLocally = data?.pages.some((page) => page.content?.some((notification) => notification.read))
    if (onlyUnread && readLocally) await refetch()
    return fetchNextPage()
  }, [data, onlyUnread, refetch, fetchNextPage])

  return { ...query, notifications: flattenUniquePages(data), loadMore }
}

function useNotificationMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll }),
  })
}

/**
 * Marcar un aviso como leído: se marca en las listas en caché sin recargarlas, así el aviso abierto junto a la
 * Bandeja no desaparece de «No leídas» mientras se lee (sale en la próxima recarga). Los contadores sí se recargan.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const lists = { queryKey: [...queryKeys.notificationsAll, 'list'] }
  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: (_result, notificationId) => {
      queryClient.setQueriesData(lists, (data) => markReadInPages(data, notificationId))
      queryClient.invalidateQueries({ ...lists, refetchType: 'none' })
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationCounts })
    },
  })
}

export const useMarkAllAsRead = () => useNotificationMutation(notificationsApi.markAllAsRead)
