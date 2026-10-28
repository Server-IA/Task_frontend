import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { issuesApi } from './api'

/** Reemplaza un issue en todas las listas en caché del proyecto (sin esperar a recargarlas). */
function replaceInLists(queryClient, projectId, issue) {
  queryClient.setQueriesData({ queryKey: queryKeys.issuesOf(projectId) }, (page) =>
    page?.content
      ? { ...page, content: page.content.map((item) => (item.id === issue.id ? issue : item)) }
      : page,
  )
}

/** Lo que cambia cuando cambia un issue: listas, avance de ciclos/módulos, historial y resúmenes. */
function invalidateAfterIssueChange(queryClient, projectId, issueId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
  queryClient.invalidateQueries({ queryKey: ['subIssues'] })
  queryClient.invalidateQueries({ queryKey: queryKeys.cycles(projectId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.modules(projectId) })
  // Los conteos de tareas (abiertas, vencidas, subtareas) vienen en el proyecto y en las tareas padre
  queryClient.invalidateQueries({ queryKey: ['project'] })
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  queryClient.invalidateQueries({ queryKey: ['issue'] })
  // Vistas que resumen tareas de varios lados: estadísticas, Mi trabajo y la actividad del workspace
  queryClient.invalidateQueries({ queryKey: ['stats', projectId] })
  queryClient.invalidateQueries({ queryKey: ['myWork'] })
  queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
  if (issueId) queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) })
}

export function useIssues(slug, projectId, params, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.issues(projectId, params),
    queryFn: () => issuesApi.list(slug, projectId, params),
    enabled: Boolean(slug && projectId) && enabled,
    placeholderData: keepPreviousData,
  })
}

export function useIssue(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.issue(issueId),
    queryFn: () => issuesApi.get(slug, projectId, issueId),
    enabled: Boolean(slug && projectId && issueId),
    // Mientras carga, muestra lo que ya hay en las listas (el panel abre al instante)
    placeholderData: () => {
      for (const [, page] of queryClient.getQueriesData({ queryKey: queryKeys.issuesOf(projectId) })) {
        const found = page?.content?.find((issue) => issue.id === issueId)
        if (found) return found
      }
      return undefined
    },
  })
}

export function useSubIssues(slug, projectId, issueId) {
  return useQuery({
    queryKey: queryKeys.subIssues(issueId),
    queryFn: () => issuesApi.subIssues(slug, projectId, issueId),
    enabled: Boolean(issueId),
  })
}

export function useCreateIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => issuesApi.create(slug, projectId, body),
    onSuccess: (issue) => {
      queryClient.setQueryData(queryKeys.issue(issue.id), issue)
      invalidateAfterIssueChange(queryClient, projectId)
    },
  })
}

/** Edición parcial: `mutate({ issueId, ...cambios })`. */
export function useUpdateIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, ...body }) => issuesApi.update(slug, projectId, issueId, body),
    onSuccess: (issue) => {
      queryClient.setQueryData(queryKeys.issue(issue.id), issue)
      replaceInLists(queryClient, projectId, issue)
      invalidateAfterIssueChange(queryClient, projectId, issue.id)
    },
  })
}

/**
 * Mover en el Kanban con actualización optimista.
 * `mutate({ issueId, stateId, afterIssueId, beforeIssueId, state, sortOrder })`: `state` y `sortOrder`
 * solo se usan para pintar el cambio al instante (lo que el backend calculará).
 */
export function useMoveIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, stateId, afterIssueId, beforeIssueId }) =>
      issuesApi.move(slug, projectId, issueId, { stateId, afterIssueId, beforeIssueId }),
    onMutate: async ({ issueId, state, sortOrder }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.issuesOf(projectId) })
      const snapshots = queryClient.getQueriesData({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.setQueriesData({ queryKey: queryKeys.issuesOf(projectId) }, (page) =>
        page?.content
          ? {
              ...page,
              content: page.content.map((issue) => (issue.id === issueId ? { ...issue, state, sortOrder } : issue)),
            }
          : page,
      )
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value))
    },
    onSuccess: (issue) => queryClient.setQueryData(queryKeys.issue(issue.id), issue),
    onSettled: (_data, _error, { issueId }) => invalidateAfterIssueChange(queryClient, projectId, issueId),
  })
}

export function useDeleteIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (issueId) => issuesApi.remove(slug, projectId, issueId),
    onSuccess: (_data, issueId) => {
      queryClient.removeQueries({ queryKey: queryKeys.issue(issueId) })
      invalidateAfterIssueChange(queryClient, projectId)
    },
  })
}

export function useActivity(slug, projectId, issueId) {
  return useQuery({
    queryKey: queryKeys.activity(issueId),
    queryFn: () => issuesApi.activity(slug, projectId, issueId),
    enabled: Boolean(issueId),
  })
}
