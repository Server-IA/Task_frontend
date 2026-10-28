import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { checklistApi } from './api'
import { moveChecklistItem, summarizeChecklist } from './checklistMath'

/** Máximo de criterios y pasos por tarea (el backend responde 409 al pasarse). */
export const CHECKLIST_LIMIT = 100

export function useChecklist(slug, projectId, issueId) {
  return useQuery({
    queryKey: queryKeys.checklist(issueId),
    queryFn: () => checklistApi.list(slug, projectId, issueId),
    enabled: Boolean(slug && projectId && issueId),
  })
}

/** Copia los conteos (criterios y pasos hechos) a la tarea y a las listas en caché: tarjetas y filas cambian al instante. */
function syncIssueCounts(queryClient, projectId, issueId, items) {
  const counts = summarizeChecklist(items)
  queryClient.setQueryData(queryKeys.issue(issueId), (issue) => (issue ? { ...issue, ...counts } : issue))
  queryClient.setQueriesData({ queryKey: queryKeys.issuesOf(projectId) }, (page) =>
    page?.content
      ? { ...page, content: page.content.map((issue) => (issue.id === issueId ? { ...issue, ...counts } : issue)) }
      : page,
  )
}

/**
 * Mutación de la checklist con cambio optimista: `optimistic(items, variables)` pinta el resultado esperado y
 * `merge(items, result, variables)` incorpora la respuesta. Al terminar la última se recarga lo del servidor.
 */
function useChecklistMutation(slug, projectId, issueId, { mutationFn, optimistic, merge }) {
  const queryClient = useQueryClient()
  const key = queryKeys.checklist(issueId)
  const setItems = (items) => {
    queryClient.setQueryData(key, items)
    syncIssueCounts(queryClient, projectId, issueId, items)
  }
  return useMutation({
    mutationKey: ['checklist', issueId],
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      if (previous && optimistic) setItems(optimistic(previous, variables))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) setItems(context.previous)
    },
    onSuccess: (result, variables) => {
      const current = queryClient.getQueryData(key)
      if (current && merge) setItems(merge(current, result, variables))
    },
    onSettled: () => {
      // Con varias seguidas (marcar rápido), solo la última recarga: si no, la respuesta pisaría a las pendientes
      if (queryClient.isMutating({ mutationKey: ['checklist', issueId] }) > 1) return
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: queryKeys.issue(issueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.invalidateQueries({ queryKey: ['myWork'] })
    },
  })
}

/** `mutate({ kind, text })`: queda al final de los de su tipo. */
export const useAddChecklistItem = (slug, projectId, issueId) =>
  useChecklistMutation(slug, projectId, issueId, {
    mutationFn: (body) => checklistApi.create(slug, projectId, issueId, body),
    merge: (items, created) => [...items.filter((item) => item.id !== created.id), created],
  })

/** `mutate({ itemId, text?, done? })` */
export const useUpdateChecklistItem = (slug, projectId, issueId) =>
  useChecklistMutation(slug, projectId, issueId, {
    mutationFn: ({ itemId, ...body }) => checklistApi.update(slug, projectId, issueId, itemId, body),
    optimistic: (items, { itemId, ...changes }) => items.map((item) => (item.id === itemId ? { ...item, ...changes } : item)),
  })

/** `mutate({ itemId, position })`: mueve el elemento dentro de su tipo (los demás se renumeran). */
export const useMoveChecklistItem = (slug, projectId, issueId) =>
  useChecklistMutation(slug, projectId, issueId, {
    mutationFn: ({ itemId, position }) => checklistApi.update(slug, projectId, issueId, itemId, { position }),
    optimistic: (items, { itemId, position }) => moveChecklistItem(items, itemId, position)?.items ?? items,
  })

/** `mutate(itemId)` */
export const useDeleteChecklistItem = (slug, projectId, issueId) =>
  useChecklistMutation(slug, projectId, issueId, {
    mutationFn: (itemId) => checklistApi.remove(slug, projectId, issueId, itemId),
    optimistic: (items, itemId) => {
      const removed = items.find((item) => item.id === itemId)
      if (!removed) return items
      return items
        .filter((item) => item.id !== itemId)
        .map((item) => (item.kind === removed.kind && item.position > removed.position ? { ...item, position: item.position - 1 } : item))
    },
  })
