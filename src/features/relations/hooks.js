import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { searchApi } from '@/features/search/api'
import { relationsApi } from './api'

/** Resultados de otros proyectos en «agregar relación» (la búsqueda global admite hasta 20). */
const SEARCH_LIMIT = 20

export function useRelations(slug, projectId, issueId, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.relations(issueId),
    queryFn: () => relationsApi.list(slug, projectId, issueId),
    enabled: Boolean(slug && projectId && issueId) && enabled,
  })
}

/** Tareas de todo el workspace (proyectos a los que tengo acceso) que coinciden con el texto; sin texto, nada. */
export function useWorkspaceIssueSearch(slug, q) {
  const query = q.trim()
  return useQuery({
    queryKey: [...queryKeys.search(slug, query), SEARCH_LIMIT],
    queryFn: () => searchApi.issues(slug, query, SEARCH_LIMIT),
    enabled: Boolean(slug && query),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

/**
 * Una relación cambia las dos tareas (que pueden ser de proyectos distintos): sus relaciones, el bloqueo que se
 * ve en tarjetas y filas (blockedByCodes, blockingCodes), los conteos de las vistas guardadas y el historial.
 */
function invalidateAfterRelationChange(queryClient, projectIds, issueIds) {
  for (const id of issueIds.filter(Boolean)) {
    queryClient.invalidateQueries({ queryKey: queryKeys.relations(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.issue(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.activity(id) })
  }
  for (const projectId of new Set(projectIds.filter(Boolean))) {
    queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.savedViews(projectId) })
    // «Historias» muestra las relacionadas y los bloqueos de cada historia
    queryClient.invalidateQueries({ queryKey: queryKeys.stories(projectId) })
  }
  queryClient.invalidateQueries({ queryKey: ['subIssues'] })
  queryClient.invalidateQueries({ queryKey: ['myWork'] })
  queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
}

/**
 * `mutate({ type, otherId, otherProjectId? })`: BLOCKS (esta bloquea a la otra), BLOCKED_BY o RELATES.
 * La otra puede ser de cualquier proyecto del workspace al que tenga acceso.
 */
export function useAddRelation(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, otherId }) => relationsApi.create(slug, projectId, issueId, { type, issueId: otherId }),
    onSuccess: (_relation, { otherId, otherProjectId }) =>
      invalidateAfterRelationChange(queryClient, [projectId, otherProjectId], [issueId, otherId]),
  })
}

/** `mutate({ relationId, otherId, otherProjectId? })`; la relación desaparece de la lista al instante. */
export function useRemoveRelation(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ relationId }) => relationsApi.remove(slug, projectId, issueId, relationId),
    onMutate: async ({ relationId }) => {
      const key = queryKeys.relations(issueId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      if (previous) {
        const without = (list = []) => list.filter((relation) => relation.relationId !== relationId)
        queryClient.setQueryData(key, {
          blocks: without(previous.blocks),
          blockedBy: without(previous.blockedBy),
          related: without(previous.related),
        })
      }
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.relations(issueId), context.previous)
    },
    onSettled: (_data, _error, { otherId, otherProjectId }) =>
      invalidateAfterRelationChange(queryClient, [projectId, otherProjectId], [issueId, otherId]),
  })
}
