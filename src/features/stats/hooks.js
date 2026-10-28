import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { statsApi } from './api'

/** Al cambiar el periodo se mantienen los datos anteriores (atenuados) mientras llegan los nuevos. */
export function useProjectStats(slug, projectId, weeks) {
  return useQuery({
    queryKey: queryKeys.stats(projectId, weeks),
    queryFn: () => statsApi.get(slug, projectId, weeks),
    enabled: Boolean(slug && projectId),
    placeholderData: keepPreviousData,
  })
}
