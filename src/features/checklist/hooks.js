import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { ApiError } from '@/lib/errors'
import { useSessionStore } from '@/stores/sessionStore'
import { checklistApi } from './api'
import { markChecked, moveChecklistItem, summarizeChecklist } from './checklistMath'

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

/** `mutate({ itemId, text?, done? })`: al marcar se ve enseguida quién lo marcó (yo, ahora). */
export const useUpdateChecklistItem = (slug, projectId, issueId) =>
  useChecklistMutation(slug, projectId, issueId, {
    mutationFn: ({ itemId, ...body }) => checklistApi.update(slug, projectId, issueId, itemId, body),
    optimistic: (items, { itemId, ...changes }) =>
      items.map((item) =>
        item.id === itemId ? markChecked({ ...item, ...changes }, changes.done, useSessionStore.getState().user) : item,
      ),
  })

/** `mutate({ itemId, position })`: mueve el elemento dentro de su tipo (los demás se renumeran). */
export const useMoveChecklistItem = (slug, projectId, issueId) =>
  useChecklistMutation(slug, projectId, issueId, {
    mutationFn: ({ itemId, position }) => checklistApi.update(slug, projectId, issueId, itemId, { position }),
    optimistic: (items, { itemId, position }) => moveChecklistItem(items, itemId, position)?.items ?? items,
  })

/** Mensaje cuando los pasos no caben en el checklist (`room`: cuántos caben todavía). */
export function checklistFullMessage(room) {
  if (room <= 0) return `El checklist ya tiene ${CHECKLIST_LIMIT} criterios y pasos, el máximo`
  return `Solo caben ${room} ${room === 1 ? 'paso más' : 'pasos más'} en el checklist (máximo ${CHECKLIST_LIMIT})`
}

/**
 * «Pasar al checklist» desde la descripción: `mutateAsync(casillas)` crea un paso por casilla, en orden (las
 * marcadas quedan hechas) y devuelve `{ created, error }`: cuántos se crearon (completos, con su marca) y, si uno
 * falló, el error (los siguientes no se intentan). Antes comprueba que quepan todos: si no, falla sin crear ninguno. Así quien llama
 * quita de la descripción solo las casillas que de verdad quedaron en el checklist.
 */
export function useMoveToChecklist(slug, projectId, issueId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (items) => {
      const current = await queryClient.fetchQuery({
        queryKey: queryKeys.checklist(issueId),
        queryFn: () => checklistApi.list(slug, projectId, issueId),
        staleTime: 0,
      })
      const room = CHECKLIST_LIMIT - (current?.length ?? 0)
      // Un ApiError, para que el aviso muestre este mensaje (un Error suelto se leería como un fallo de conexión)
      if (items.length > room) throw new ApiError({ status: 409, message: checklistFullMessage(room) })
      let created = 0
      try {
        for (const item of items) {
          const step = await checklistApi.create(slug, projectId, issueId, { kind: 'CHECK', text: item.text.slice(0, 500) })
          // El backend no recibe `done` al crear: si después no se puede marcar, el paso no cuenta como pasado (la
          // casilla se queda en la descripción) y se quita del checklist para que no quede dos veces ni sin marcar
          if (item.checked) {
            try {
              await checklistApi.update(slug, projectId, issueId, step.id, { done: true })
            } catch (error) {
              await checklistApi.remove(slug, projectId, issueId, step.id).catch(() => {})
              throw error
            }
          }
          created += 1
        }
      } catch (error) {
        return { created, error }
      }
      return { created, error: null }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklist(issueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issue(issueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) })
      queryClient.invalidateQueries({ queryKey: ['myWork'] })
    },
  })
}

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
