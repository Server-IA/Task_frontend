import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { relationsApi } from './api'

export function useRelations(slug, projectId, issueId, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.relations(issueId),
    queryFn: () => relationsApi.list(slug, projectId, issueId),
    enabled: Boolean(slug && projectId && issueId) && enabled,
  })
}

/**
 * Una relación cambia las dos tareas: sus relaciones, el bloqueo que se ve en tarjetas y filas
 * (blockedByCount) y el historial de ambas.
 */
function invalidateAfterRelationChange(queryClient, projectId, issueIds) {
  for (const id of issueIds.filter(Boolean)) {
    queryClient.invalidateQueries({ queryKey: queryKeys.relations(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.issue(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.activity(id) })
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
  queryClient.invalidateQueries({ queryKey: ['subIssues'] })
  queryClient.invalidateQueries({ queryKey: ['myWork'] })
  queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
}

/** `mutate({ type, otherId })`: BLOCKS (esta bloquea a la otra), BLOCKED_BY o RELATES. */
export function useAddRelation(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, otherId }) => relationsApi.create(slug, projectId, issueId, { type, issueId: otherId }),
    onSuccess: (_relation, { otherId }) => invalidateAfterRelationChange(queryClient, projectId, [issueId, otherId]),
  })
}

/** `mutate({ relationId, otherId })`; la relación desaparece de la lista al instante. */
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
    onSettled: (_data, _error, { otherId }) => invalidateAfterRelationChange(queryClient, projectId, [issueId, otherId]),
  })
}
