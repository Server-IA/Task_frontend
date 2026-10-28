import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { searchApi } from './api'

/** Búsqueda de tareas en el workspace (solo con texto; mientras se escribe se mantienen los resultados). */
export function useIssueSearch(slug, q) {
  const query = q.trim()
  return useQuery({
    queryKey: queryKeys.search(slug, query),
    queryFn: () => searchApi.issues(slug, query),
    enabled: Boolean(slug && query),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
