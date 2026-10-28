import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { myWorkApi } from './api'

/** «Mi trabajo» de una vista. La sidebar usa la de asignadas para su contador (comparten caché). */
export function useMyWork(slug, view = 'assigned') {
  return useQuery({
    queryKey: queryKeys.myWork(slug, view),
    queryFn: () => myWorkApi.get(slug, view),
    enabled: Boolean(slug),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
