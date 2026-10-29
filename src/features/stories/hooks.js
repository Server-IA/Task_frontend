import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { useInvalidateAfterIssueChange } from '@/features/issues/hooks'
import { toApiError } from '@/lib/errors'
import { storiesApi } from './api'

/** Historias del proyecto (la sección «Historias» y los carriles del tablero). */
export function useStories(slug, projectId, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.stories(projectId),
    queryFn: () => storiesApi.list(slug, projectId),
    enabled: Boolean(slug && projectId) && enabled,
    staleTime: 15_000,
  })
}

/** Al terminar, la historia y sus tareas cambian: la caché de la historia toma la respuesta y se recarga lo demás. */
function useStoryMutation(slug, projectId, mutationFn) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateAfterIssueChange(projectId)
  return useMutation({
    mutationFn,
    onSuccess: (result, variables) => {
      if (result && !Array.isArray(result)) queryClient.setQueryData(queryKeys.issue(result.id), result)
      invalidate(variables?.storyId ?? variables)
    },
  })
}

/** `mutate({ storyId, items, reopen? })` */
export const useSplitStory = (slug, projectId) =>
  useStoryMutation(slug, projectId, ({ storyId, ...body }) => storiesApi.split(slug, projectId, storyId, body))

/** `mutate(storyId)` */
export const useCloseStory = (slug, projectId) => useStoryMutation(slug, projectId, (storyId) => storiesApi.close(slug, projectId, storyId))

/** `mutate(storyId)` */
export const useReopenStory = (slug, projectId) => useStoryMutation(slug, projectId, (storyId) => storiesApi.reopen(slug, projectId, storyId))

/** El 409 de agregar una tarea a una historia cerrada sin reabrirla. */
export const isStoryClosedError = (error) => {
  const { status, code } = toApiError(error)
  return status === 409 && code === 'STORY_CLOSED'
}
