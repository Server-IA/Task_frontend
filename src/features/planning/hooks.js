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
 * Mutaciones de ciclos/módulos. Las fechas y las tareas de un ciclo mueven las estadísticas (burndown).
 * Cambiar sus issues afecta el avance, los listados de issues (filtros ?cycle= / ?module=), el detalle de cada
 * issue (muestra su ciclo y módulos), las historias y los demás ciclos/módulos (pasar una tarea del ciclo A al B
 * la saca de A).
 */
function usePlanningMutation(kind, slug, projectId, mutationFn, { touchesIssues = false } = {}) {
  const queryClient = useQueryClient()
  const { listKey, itemKey } = PLANNING[kind]
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (result?.id) queryClient.setQueryData(itemKey(result.id), result)
      queryClient.invalidateQueries({ queryKey: listKey(projectId) })
      queryClient.invalidateQueries({ queryKey: ['stats', projectId] })
      if (touchesIssues) {
        // Prefijo de todos los ciclos (o módulos), sin volver a pedir el que ya llegó en la respuesta
        queryClient.invalidateQueries({
          queryKey: [itemKey('')[0]],
          predicate: (query) => query.queryKey[1] !== result?.id,
        })
        queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
        queryClient.invalidateQueries({ queryKey: ['issue'] })
        queryClient.invalidateQueries({ queryKey: ['activity'] })
        queryClient.invalidateQueries({ queryKey: queryKeys.stories(projectId) })
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

/** Vista previa del cierre de un ciclo (solo se pide con el diálogo abierto; siempre fresca). */
export function useClosePreview(slug, projectId, cycleId, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.closePreview(cycleId),
    queryFn: () => cyclesApi.closePreview(slug, projectId, cycleId),
    enabled: Boolean(slug && projectId && cycleId) && enabled,
    staleTime: 0,
    gcTime: 0,
  })
}

/**
 * Cerrar un ciclo mueve tareas a otro ciclo o al backlog: cambian los ciclos, las tareas y su historial,
 * las estadísticas (burndown), Mi trabajo, la actividad, la daily y, si se abrió, la retrospectiva.
 * `mutate({ id, ...CloseCycleRequest })`.
 */
export function useCloseCycle(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => cyclesApi.close(slug, projectId, id, body),
    onSuccess: (result) => {
      if (result?.cycle?.id) queryClient.setQueryData(queryKeys.cycle(result.cycle.id), result.cycle)
      queryClient.invalidateQueries({ queryKey: queryKeys.cycles(projectId) })
      queryClient.invalidateQueries({ queryKey: ['cycle'] })
      queryClient.invalidateQueries({ queryKey: ['closePreview'] })
      queryClient.invalidateQueries({ queryKey: ['retro'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.invalidateQueries({ queryKey: ['subIssues'] })
      queryClient.invalidateQueries({ queryKey: ['issue'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      queryClient.invalidateQueries({ queryKey: ['stats', projectId] })
      queryClient.invalidateQueries({ queryKey: ['myWork'] })
      queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyOf(projectId) })
    },
  })
}
