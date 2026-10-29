import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { toApiError } from '@/lib/errors'
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
  // Cuántas tareas muestra cada vista guardada
  queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(projectId) })
  // Vistas que resumen tareas de varios lados: estadísticas, Mi trabajo y la actividad del workspace
  queryClient.invalidateQueries({ queryKey: ['stats', projectId] })
  queryClient.invalidateQueries({ queryKey: ['myWork'] })
  queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
  // Pastillas de tareas dentro de descripciones y comentarios (título y estado)
  queryClient.invalidateQueries({ queryKey: ['taskRef'] })
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

/** `mutate(cuerpo)`; con `templateId` la plantilla suma un uso. */
export function useCreateIssue(slug, projectId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body) => issuesApi.create(slug, projectId, body),
    onSuccess: (issue, body) => {
      queryClient.setQueryData(queryKeys.issue(issue.id), issue)
      invalidateAfterIssueChange(queryClient, projectId)
      if (body?.templateId) queryClient.invalidateQueries({ queryKey: queryKeys.templates(projectId) })
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
 * El 409 de una descripción que otra persona cambió después de la versión de la que se partió:
 * `{ description, version, by, at, issue }` (la descripción actual, su versión, quién la guardó, cuándo y la tarea
 * completa). `null` si el error es otro.
 * @returns {{ description: string, version: number, by: import('@/api/types').UserSummary | null, at: string | null, issue: import('@/api/types').IssueResponse } | null}
 */
export function descriptionConflict(error) {
  const { status, code, data } = toApiError(error)
  if (status !== 409 || code !== 'DESCRIPTION_CONFLICT' || !data) return null
  return {
    description: (data.description ?? '').trim(),
    version: data.descriptionVersion ?? 0,
    by: data.descriptionUpdatedBy ?? null,
    at: data.descriptionUpdatedAt ?? null,
    issue: data.issue,
  }
}

/** Guarda en la caché la tarea que llegó, salvo que la caché ya tenga una descripción más nueva. */
function keepNewest(queryClient, projectId, issue) {
  const cached = queryClient.getQueryData(queryKeys.issue(issue.id))
  if ((cached?.descriptionVersion ?? -1) > (issue.descriptionVersion ?? 0)) return
  queryClient.setQueryData(queryKeys.issue(issue.id), issue)
  replaceInLists(queryClient, projectId, issue)
}

/**
 * Guardar la descripción: `mutate({ description, base })`. `base` es la `descriptionVersion` de la que se partió:
 * si otra persona la guardó después, el backend responde 409 sin cambiar nada (ver `descriptionConflict`) y la caché
 * queda con su versión. El editor guarda mientras se escribe, así que no recarga todo lo que recarga una edición
 * cualquiera (listas, ciclos, estadísticas): solo la tarea, sus filas en las listas y el historial. La tarea en caché
 * cambia al instante (las casillas marcadas sin entrar a editar se ven enseguida).
 */
export function useSaveDescription(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['saveDescription', issueId],
    mutationFn: ({ description, base }) =>
      issuesApi.update(slug, projectId, issueId, { description, baseDescriptionVersion: base ?? undefined }),
    onMutate: async ({ description }) => {
      // Una recarga en curso traería la versión de antes de este guardado
      await queryClient.cancelQueries({ queryKey: queryKeys.issue(issueId) })
      queryClient.setQueryData(queryKeys.issue(issueId), (issue) => (issue ? { ...issue, description: description || null } : issue))
    },
    onSuccess: (issue) => {
      keepNewest(queryClient, projectId, issue)
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) })
      queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
    },
    onError: (error) => {
      const conflict = descriptionConflict(error)
      if (conflict?.issue) keepNewest(queryClient, projectId, conflict.issue)
      else queryClient.invalidateQueries({ queryKey: queryKeys.issue(issueId) })
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
