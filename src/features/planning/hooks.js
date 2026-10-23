import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { cyclesApi, modulesApi } from './api'

/** Configuración de cada tipo: ciclos o módulos comparten pantallas y hooks. */
export const PLANNING = {
  cycles: {
    api: cyclesApi,
    listKey: queryKeys.cycles,
    itemKey: queryKeys.cycle,
    filterParam: 'cycle',
  },
  modules: {
    api: modulesApi,
    listKey: queryKeys.modules,
    itemKey: queryKeys.module,
    filterParam: 'module',
  },
}

export function usePlanningList(kind, slug, projectId) {
  const { api, listKey } = PLANNING[kind]
  return useQuery({
    queryKey: listKey(projectId),
    queryFn: () => api.list(slug, projectId),
    enabled: Boolean(slug && projectId),
  })
}

export function usePlanningItem(kind, slug, projectId, id) {
  const { api, itemKey } = PLANNING[kind]
  return useQuery({
    queryKey: itemKey(id),
    queryFn: () => api.get(slug, projectId, id),
    enabled: Boolean(id),
  })
}

/**
 * Mutaciones de ciclos/módulos. Cambiar sus issues afecta el avance, los listados de issues
 * (filtros ?cycle= / ?module=) y el detalle de cada issue (muestra su ciclo y módulos).
 */
function usePlanningMutation(kind, slug, projectId, mutationFn, { touchesIssues = false } = {}) {
  const queryClient = useQueryClient()
  const { listKey, itemKey } = PLANNING[kind]
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (result?.id) queryClient.setQueryData(itemKey(result.id), result)
      queryClient.invalidateQueries({ queryKey: listKey(projectId) })
      if (touchesIssues) {
        queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
        queryClient.invalidateQueries({ queryKey: ['issue'] })
        queryClient.invalidateQueries({ queryKey: ['activity'] })
      }
    },
  })
}

export const useCreatePlanning = (kind, slug, projectId) =>
  usePlanningMutation(kind, slug, projectId, (body) => PLANNING[kind].api.create(slug, projectId, body))

export const useUpdatePlanning = (kind, slug, projectId) =>
  usePlanningMutation(kind, slug, projectId, ({ id, ...body }) => PLANNING[kind].api.update(slug, projectId, id, body))

export const useDeletePlanning = (kind, slug, projectId) =>
  usePlanningMutation(kind, slug, projectId, (id) => PLANNING[kind].api.remove(slug, projectId, id), {
    touchesIssues: true,
  })

export const useAddPlanningIssues = (kind, slug, projectId) =>
  usePlanningMutation(
    kind,
    slug,
    projectId,
    ({ id, issueIds }) => PLANNING[kind].api.addIssues(slug, projectId, id, issueIds),
    { touchesIssues: true },
  )

export const useRemovePlanningIssue = (kind, slug, projectId) =>
  usePlanningMutation(
    kind,
    slug,
    projectId,
    ({ id, issueId }) => PLANNING[kind].api.removeIssue(slug, projectId, id, issueId),
    { touchesIssues: true },
  )
