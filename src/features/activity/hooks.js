import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { statesApi } from '@/features/projects/api'
import { activityApi } from './api'

const PAGE_SIZE = 30

/**
 * Feed de actividad del workspace por páginas («Cargar más»).
 * @param {{ type: string, projectId?: string, actorId?: string }} filters
 */
export function useWorkspaceActivity(slug, filters) {
  return useInfiniteQuery({
    queryKey: queryKeys.workspaceActivity(slug, filters),
    queryFn: ({ pageParam }) => activityApi.feed(slug, { ...filters, page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: Boolean(slug),
  })
}

/** Resumen de los últimos `days` días: cambios, comentarios, cerradas, creadas y por proyecto. */
export function useActivitySummary(slug, days = 7) {
  return useQuery({
    queryKey: queryKeys.activitySummary(slug, days),
    queryFn: () => activityApi.summary(slug, days),
    enabled: Boolean(slug),
  })
}

/**
 * Grupo de cada estado por proyecto y nombre («proyecto:nombre» → 'COMPLETED'…), para saber si un cambio de
 * estado del feed completó la tarea. Usa la misma caché que los selectores de estado de cada proyecto.
 * @param {string[]} projectIds
 * @returns {Map<string, string>}
 */
export function useStateGroups(slug, projectIds) {
  return useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: queryKeys.states(projectId),
      queryFn: () => statesApi.list(slug, projectId),
      staleTime: 5 * 60_000,
    })),
    combine: (results) => {
      const groups = new Map()
      results.forEach((result, index) => {
        for (const state of result.data ?? []) groups.set(`${projectIds[index]}:${state.name}`, state.group)
      })
      return groups
    },
  })
}
