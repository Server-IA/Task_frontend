import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { commentsApi } from './api'

export function useComments(slug, projectId, issueId) {
  return useQuery({
    queryKey: queryKeys.comments(issueId),
    queryFn: () => commentsApi.list(slug, projectId, issueId),
    enabled: Boolean(issueId),
  })
}

/** Comentar también agrega una entrada al historial del issue. */
function useCommentMutation(issueId, mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(issueId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(issueId) })
    },
  })
}

export const useCreateComment = (slug, projectId, issueId) =>
  useCommentMutation(issueId, (body) => commentsApi.create(slug, projectId, issueId, body))

export const useUpdateComment = (slug, projectId, issueId) =>
  useCommentMutation(issueId, ({ commentId, body }) => commentsApi.update(slug, projectId, issueId, commentId, body))

export const useDeleteComment = (slug, projectId, issueId) =>
  useCommentMutation(issueId, (commentId) => commentsApi.remove(slug, projectId, issueId, commentId))
