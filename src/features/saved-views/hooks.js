import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { savedViewsApi } from './api'
import { diffViewFilters, toViewFilters } from './savedViews'

export function useSavedViews(slug, projectId) {
  return useQuery({
    queryKey: queryKeys.savedViews(projectId),
    queryFn: () => savedViewsApi.list(slug, projectId),
    enabled: Boolean(slug && projectId),
    staleTime: 30_000,
  })
}

/** La respuesta entra a la lista en caché antes de recargarla: la vista nueva o cambiada se ve (y queda activa) enseguida. */
function useSavedViewMutation(projectId, mutationFn, mergeIntoList) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.savedViews(projectId), (list) => (list ? mergeIntoList(list, result, variables) : list))
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(projectId) })
    },
  })
}

export const useCreateSavedView = (slug, projectId) =>
  useSavedViewMutation(
    projectId,
    (body) => savedViewsApi.create(slug, projectId, body),
    (list, created) => [...list, created],
  )

/** `mutate({ viewId, ...cambios })` */
export const useUpdateSavedView = (slug, projectId) =>
  useSavedViewMutation(
    projectId,
    ({ viewId, ...body }) => savedViewsApi.update(slug, projectId, viewId, body),
    (list, updated) => list.map((view) => (view.id === updated.id ? updated : view)),
  )

export const useDeleteSavedView = (slug, projectId) =>
  useSavedViewMutation(
    projectId,
    (viewId) => savedViewsApi.remove(slug, projectId, viewId),
    (list, _result, viewId) => list.filter((view) => view.id !== viewId),
  )

/**
 * `mutate({ views, body })`: `views` es la lista con el orden nuevo (se pinta enseguida) y `body` lo que va a
 * PUT /views/order. Si falla, vuelve el orden anterior.
 */
export function useReorderSavedViews(slug, projectId) {
  const queryClient = useQueryClient()
  const key = queryKeys.savedViews(projectId)
  const mutationKey = ['savedViewsOrder', projectId]
  // Con varios movimientos seguidos, solo el último toma la respuesta y recarga (si no, pisaría a los pendientes)
  const othersPending = () => queryClient.isMutating({ mutationKey }) > 1
  return useMutation({
    mutationKey,
    mutationFn: ({ body }) => savedViewsApi.reorder(slug, projectId, body),
    onMutate: async ({ views }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      queryClient.setQueryData(key, views)
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (list) => {
      if (!othersPending()) queryClient.setQueryData(key, list)
    },
    onSettled: () => {
      if (!othersPending()) queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

/**
 * Vista guardada activa (la de `?savedView=` en la URL), lo que hay en pantalla con la forma de una vista
 * y qué partes cambiaron respecto de ella.
 * @param {ReturnType<typeof import('@/features/issues/useIssueFilters').useIssueFilters>} issueFilters
 */
export function useActiveSavedView(slug, projectId, issueFilters) {
  const { data: views = [] } = useSavedViews(slug, projectId)
  const active = views.find((view) => view.id === issueFilters.activeViewId) ?? null
  const current = toViewFilters(issueFilters)
  const changed = active ? diffViewFilters(active.filters, current) : []
  return { views, active, current, changed }
}
