import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { notificationsApi } from './api'

const PAGE_SIZE = 20

/** Contador del badge: se consulta cada 30 s mientras la pestaña está visible. */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    select: (result) => result.count,
  })
}

export function useNotifications({ unread }) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications({ unread }),
    queryFn: ({ pageParam }) => notificationsApi.list({ unread, page: pageParam, size: PAGE_SIZE }),
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

export const useMarkAsRead = () => useNotificationMutation(notificationsApi.markAsRead)

export const useMarkAllAsRead = () => useNotificationMutation(notificationsApi.markAllAsRead)
