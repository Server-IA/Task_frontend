import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { retroApi } from './api'
import { applyVote, removeNote, upsertNote } from './retroNotes'

/** Cada cuánto se traen las notas y votos de los demás mientras la retro está abierta. */
const LIVE_REFRESH_MS = 15_000

export function useRetro(slug, projectId, cycleId) {
  return useQuery({
    queryKey: queryKeys.retro(cycleId),
    queryFn: () => retroApi.get(slug, projectId, cycleId),
    enabled: Boolean(slug && projectId && cycleId),
    // Abierta y sin terminar: lo que escriben y votan los demás aparece solo (con la pestaña visible)
    refetchInterval: (query) => (query.state.data?.started && !query.state.data?.finishedAt ? LIVE_REFRESH_MS : false),
  })
}

/**
 * Cambia la retro en caché con `update(retro)` (si ya estaba cargada) y la vuelve a pedir: así una recarga
 * automática que salió antes del cambio no lo pisa (invalidar cancela la que esté en vuelo).
 */
function useSetRetro(cycleId) {
  const queryClient = useQueryClient()
  return (update) => {
    queryClient.setQueryData(queryKeys.retro(cycleId), (retro) => (retro ? update(retro) : retro))
    queryClient.invalidateQueries({ queryKey: queryKeys.retro(cycleId) })
  }
}

/** Empezar o terminar la retro (project manager): la respuesta es la retro completa. */
function useRetroPhase(slug, projectId, cycleId, action) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => retroApi[action](slug, projectId, cycleId),
    onSuccess: (retro) => queryClient.setQueryData(queryKeys.retro(cycleId), retro),
  })
}

export const useStartRetro = (slug, projectId, cycleId) => useRetroPhase(slug, projectId, cycleId, 'start')
export const useFinishRetro = (slug, projectId, cycleId) => useRetroPhase(slug, projectId, cycleId, 'finish')

/** `mutate({ column, text })`: la nota nueva aparece en su columna sin esperar a recargar. */
export function useCreateRetroNote(slug, projectId, cycleId) {
  const setRetro = useSetRetro(cycleId)
  return useMutation({
    mutationFn: (body) => retroApi.createNote(slug, projectId, cycleId, body),
    onSuccess: (note) => setRetro((retro) => upsertNote(retro, note)),
  })
}

/** `mutate({ noteId, text })`. */
export function useUpdateRetroNote(slug, projectId, cycleId) {
  const setRetro = useSetRetro(cycleId)
  return useMutation({
    mutationFn: ({ noteId, text }) => retroApi.updateNote(slug, projectId, cycleId, noteId, text),
    onSuccess: (note) => setRetro((retro) => upsertNote(retro, note)),
  })
}

/** `mutate(note)`: si tenía tu voto, lo recuperas. */
export function useDeleteRetroNote(slug, projectId, cycleId) {
  const setRetro = useSetRetro(cycleId)
  return useMutation({
    mutationFn: (note) => retroApi.removeNote(slug, projectId, cycleId, note.id),
    onSuccess: (_result, note) => setRetro((retro) => removeNote(retro, note.id)),
  })
}

/**
 * Votar o quitar el voto con actualización optimista: `mutate({ note, vote: true | false })`.
 * Si el backend lo rechaza (sin votos, retro terminada) se vuelve a lo anterior.
 */
export function useVoteRetroNote(slug, projectId, cycleId) {
  const queryClient = useQueryClient()
  const key = queryKeys.retro(cycleId)
  return useMutation({
    mutationFn: ({ note, vote }) =>
      vote ? retroApi.vote(slug, projectId, cycleId, note.id) : retroApi.unvote(slug, projectId, cycleId, note.id),
    onMutate: async ({ note, vote }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      if (previous) queryClient.setQueryData(key, applyVote(previous, note.id, vote))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSuccess: (result) =>
      queryClient.setQueryData(key, (retro) =>
        retro ? { ...upsertNote(retro, result.note), myVotesLeft: result.myVotesLeft } : retro,
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

/**
 * Acción → tarea (project manager). La tarea nueva cambia los listados, los conteos del proyecto, las
 * estadísticas, Mi trabajo y la actividad. `mutate(note)` → IssueResponse.
 */
export function useConvertRetroNote(slug, projectId, cycleId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note) => retroApi.convert(slug, projectId, cycleId, note.id),
    onSuccess: (issue) => {
      queryClient.setQueryData(queryKeys.issue(issue.id), issue)
      queryClient.invalidateQueries({ queryKey: queryKeys.retro(cycleId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.issuesOf(projectId) })
      queryClient.invalidateQueries({ queryKey: ['project'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['stats', projectId] })
      queryClient.invalidateQueries({ queryKey: ['myWork'] })
      queryClient.invalidateQueries({ queryKey: ['workspaceActivity'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyOf(projectId) })
    },
  })
}
