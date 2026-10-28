import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
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

/** @param {{ tab: keyof typeof INBOX_TABS }} options */
export function useNotifications({ tab }) {
  const filter = INBOX_TABS[tab] ?? INBOX_TABS.unread
  return useInfiniteQuery({
    queryKey: queryKeys.notifications({ tab }),
    queryFn: ({ pageParam }) => notificationsApi.list({ ...filter, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    refetchInterval: 30_000,
  })
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
